# UCP Multi-Store Demo (Agent + Stores)

This repo runs a **UCP (Universal Commerce Protocol)** demo with:

- **Agent backend** (FastAPI) that searches stores, generates invoices, and signs AP2 mandates
- **Agent frontend** (SvelteKit + shadcn-svelte) as the buyer console
- **Three store frontends** (SvelteKit + different UI libs) that expose product catalogs and AP2 endpoints

## Services & Ports

- Agent frontend: `http://localhost:5173`
- Agent backend API: `http://localhost:8000`
- Store 1 frontend (Skeleton): `http://localhost:4001`
- Store 2 frontend (SMUI): `http://localhost:4002`
- Store 3 frontend (Steeze UI): `http://localhost:4003`

## Prereqs

- Docker Desktop running
- Bun installed on host (optional, if running apps outside Docker)
- A Postgres instance (you already have one running in Docker)

## Database Setup (Per-Store DBs)

Each store uses its own database:

- Store1: `ucp_store1`
- Store2: `ucp_store2`
- Store3: `ucp_store3`

Set these env vars (or rely on defaults in `docker-compose.yml`):

```
STORE1_DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/ucp_store1
STORE2_DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/ucp_store2
STORE3_DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/ucp_store3
```

Note: TypeORM will create tables automatically, but **the databases must exist**.

## Run the Stack

From repo root:

```
docker compose up --build -d
```

This will:
- start the agent backend + frontend
- start the three store frontends
- seed store product catalogs on startup

## Using the Demo (UCP Flow)

1) Open the agent console: `http://localhost:5173`
2) Search for products (e.g. “laptop”, “hoodie”, “speaker”)
3) Add items to the cart
4) Click **Generate Invoice**
5) Click **Pay Invoice**

The agent will:
- fetch product details from each store
- compute per-store totals
- request AP2 challenges from each store
- sign mandates and submit `/complete`

## Store Endpoints (per store)

Each store exposes:

- Discovery: `/.well-known/ucp`
- Products list/search: `/api/products?q=...`
- Product detail: `/api/products/:id`
- AP2 session: `/sessions` (returns `X-UCP-Challenge`, 402)
- AP2 complete: `/complete` (verifies mandate, returns 201)

Example:
```
http://localhost:4001/.well-known/ucp
http://localhost:4001/api/products
```

## Troubleshooting

- **SvelteKit type errors**: run `bash scripts/sync-stores.sh`
- **DB errors**: confirm each database exists in Postgres
- **No products**: re-seed a store:
  ```
  cd stores/store1 && bun run db:seed
  ```

## Architecture Notes

- Agent backend uses Ed25519 signatures
- Stores verify mandates via `tweetnacl`
- Agent frontend uses shadcn-svelte
- Stores use distinct UI libraries by design:
  - Store1: Skeleton
  - Store2: SMUI
  - Store3: Steeze UI

