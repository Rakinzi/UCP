import asyncio
import base64
import json
import os
from typing import cast
from urllib.parse import urlparse, urlunparse
from typing import List, Dict, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Key Management
KEY_FILE = "private_key.pem"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "3.0"))
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "false").lower() in {"1", "true", "yes", "on"}

def get_or_create_key() -> ed25519.Ed25519PrivateKey:
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return cast(
                ed25519.Ed25519PrivateKey,
                serialization.load_pem_private_key(f.read(), password=None)
            )
    else:
        private_key = ed25519.Ed25519PrivateKey.generate()
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(KEY_FILE, "wb") as f:
            f.write(pem)
        return private_key

private_key = get_or_create_key()
public_key = private_key.public_key()

# Helper to get public key in hex/base64 for the merchants
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw
)
public_key_hex = public_bytes.hex()
print(f"Agent Public Key (Hex): {public_key_hex}")

class PayAllRequest(BaseModel):
    stores: List[str]  # List of base URLs, e.g., ["http://localhost:3001", ...]

class PaymentStatus(BaseModel):
    store: str
    status: str
    details: str

class ProductSearchResult(BaseModel):
    store: str
    id: str
    name: str
    description: Optional[str] = None
    price: float
    imageUrl: Optional[str] = None

class InvoiceItemRequest(BaseModel):
    store: str
    product_id: str
    quantity: int

class InvoiceItem(BaseModel):
    store: str
    product_id: str
    name: str
    price: float
    quantity: int
    line_total: float

class StoreTotal(BaseModel):
    store: str
    total: float

class InvoiceResponse(BaseModel):
    items: List[InvoiceItem]
    store_totals: List[StoreTotal]
    total: float

class PayRequest(BaseModel):
    items: List[InvoiceItemRequest]

@app.get("/public-key")
async def get_public_key():
    return {"public_key": public_key_hex}

@app.get("/search", response_model=List[ProductSearchResult])
async def search_products(q: str = Query(..., min_length=1)):
    stores = get_store_frontends()
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [search_store(client, store, q) for store in stores]
        results = await asyncio.gather(*tasks)

    merged: List[ProductSearchResult] = []
    for store, items in zip(stores, results):
        for item in items:
            item["store"] = store
            merged.append(ProductSearchResult(**item))
    return await rank_products_with_ollama(q, merged)

@app.post("/invoice", response_model=InvoiceResponse)
async def generate_invoice(request: PayRequest):
    items = await resolve_invoice_items(request.items)
    store_totals = summarize_store_totals(items)
    total = sum(s.total for s in store_totals)
    return InvoiceResponse(items=items, store_totals=store_totals, total=total)

@app.post("/pay", response_model=List[PaymentStatus])
async def pay_invoice(request: PayRequest):
    items = await resolve_invoice_items(request.items)
    store_totals = summarize_store_totals(items)

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [
            process_payment(client, normalize_store_url(store_total.store), store_total.total)
            for store_total in store_totals
        ]
        results = await asyncio.gather(*tasks)
    return results

@app.post("/pay-all", response_model=List[PaymentStatus])
async def pay_all(request: PayAllRequest):
    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [process_payment(client, store, 100) for store in request.stores]
        results = await asyncio.gather(*tasks)
    return results

async def process_payment(client: httpx.AsyncClient, store_url: str, order_total: float) -> PaymentStatus:
    try:
        # Normalize host URLs so host-based ports work from inside Docker.
        store_url = normalize_store_url(store_url)

        # Step 1: Get Challenge
        # Expecting 402 Payment Required and X-UCP-Challenge header
        response = await client.post(f"{store_url}/sessions", json={"order_total": order_total})
        
        challenge_b64 = response.headers.get("X-UCP-Challenge")
        if not challenge_b64:
            # If 200 OK, maybe no challenge needed? But we expect one.
            # If 402, we get it from header.
            if response.status_code != 402:
                 return PaymentStatus(store=store_url, status="failed", details=f"Unexpected status {response.status_code}")
            
        challenge_bytes = base64.b64decode(challenge_b64)
        
        # Step 2: Sign
        # Signature = sign(challenge_bytes + order_total_bytes)
        # Assuming order_total is represented as string bytes for simplicity or adhering to a specific format
        # Prompt says: private_key.sign(challenge_bytes + order_total_bytes)
        # We need to define how 'order_total_bytes' is derived. Let's assume a standard fixed amount '100' -> b'100'
        order_total_bytes = str(order_total).encode('utf-8')
        
        signature = private_key.sign(challenge_bytes + order_total_bytes)
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        # Step 3: Send Mandate
        complete_response = await client.post(
            f"{store_url}/complete", 
            headers={"X-UCP-Mandate": signature_b64},
            json={"order_total": order_total, "challenge": challenge_b64}
        )
        
        if complete_response.status_code == 201:
            return PaymentStatus(store=store_url, status="success", details="Payment Confirmed")
        else:
            return PaymentStatus(store=store_url, status="failed", details=f"Verification failed: {complete_response.text}")

    except Exception as e:
        return PaymentStatus(store=store_url, status="error", details=str(e))


def get_store_frontends() -> List[str]:
    env_value = os.getenv("STORE_FRONTENDS") or os.getenv("STORE_URLS")
    if env_value:
        return [s.strip() for s in env_value.split(",") if s.strip()]
    return [
        "http://store1-frontend:3000",
        "http://store2-frontend:3000",
        "http://store3-frontend:3000",
    ]


async def search_store(client: httpx.AsyncClient, store_url: str, query: str) -> List[Dict]:
    try:
        response = await client.get(f"{store_url}/api/products", params={"q": query})
        response.raise_for_status()
        return response.json()
    except Exception:
        return []


def _extract_json(text: str) -> Dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in response")
    return json.loads(text[start : end + 1])


async def rank_products_with_ollama(
    query: str, products: List[ProductSearchResult]
) -> List[ProductSearchResult]:
    if not OLLAMA_ENABLED or not products:
        return products

    payload_items = []
    for idx, item in enumerate(products):
        payload_items.append(
            {
                "idx": idx,
                "store": item.store,
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "price": item.price,
            }
        )

    system_prompt = (
        "You are a shopping assistant. Rank products for relevance to the user's query. "
        "Return JSON only with the key 'ranked_indices' as an array of integers (idx values)."
    )
    user_prompt = {
        "query": query,
        "products": payload_items,
        "instructions": "Return JSON only. Do not include any extra text.",
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(user_prompt)},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")
            parsed = _extract_json(content)
            ranked_indices = parsed.get("ranked_indices")
            if not isinstance(ranked_indices, list):
                return products
            ranked = []
            seen = set()
            for idx in ranked_indices:
                if isinstance(idx, int) and 0 <= idx < len(products) and idx not in seen:
                    ranked.append(products[idx])
                    seen.add(idx)
            for idx, item in enumerate(products):
                if idx not in seen:
                    ranked.append(item)
            return ranked
    except Exception:
        return products


async def resolve_invoice_items(items: List[InvoiceItemRequest]) -> List[InvoiceItem]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for item in items:
            tasks.append(fetch_product(client, normalize_store_url(item.store), item.product_id, item.quantity))
        resolved = await asyncio.gather(*tasks)

    return [item for item in resolved if item is not None]


async def fetch_product(
    client: httpx.AsyncClient, store: str, product_id: str, quantity: int
) -> Optional[InvoiceItem]:
    try:
        response = await client.get(f"{store}/api/products/{product_id}")
        response.raise_for_status()
        data = response.json()
        price = float(data["price"])
        return InvoiceItem(
            store=store,
            product_id=product_id,
            name=data["name"],
            price=price,
            quantity=quantity,
            line_total=price * quantity,
        )
    except Exception:
        return None


def summarize_store_totals(items: List[InvoiceItem]) -> List[StoreTotal]:
    totals: Dict[str, float] = {}
    for item in items:
        totals[item.store] = totals.get(item.store, 0.0) + item.line_total
    return [StoreTotal(store=store, total=total) for store, total in totals.items()]


def normalize_store_url(store_url: str) -> str:
    mapping = {
        "localhost:3001": "store1:3000",
        "127.0.0.1:3001": "store1:3000",
        "localhost:3002": "store2:3000",
        "127.0.0.1:3002": "store2:3000",
        "localhost:3003": "store3:3000",
        "127.0.0.1:3003": "store3:3000",
        "localhost:4001": "store1-frontend:3000",
        "127.0.0.1:4001": "store1-frontend:3000",
        "localhost:4002": "store2-frontend:3000",
        "127.0.0.1:4002": "store2-frontend:3000",
        "localhost:4003": "store3-frontend:3000",
        "127.0.0.1:4003": "store3-frontend:3000",
    }
    parsed = urlparse(store_url)
    host = parsed.netloc
    if host in mapping:
        parsed = parsed._replace(netloc=mapping[host])
        return urlunparse(parsed)
    return store_url

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
