<script lang="ts">
  import axios from 'axios';
  import { onMount } from 'svelte';
  import { ShoppingCart, Search, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-svelte';
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";

  type SearchResult = {
    store: string;
    id: string;
    name: string;
    description?: string;
    price: number;
  };

  type CartItem = {
    store: string;
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  };

  type Invoice = {
    items: {
      store: string;
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      line_total: number;
    }[];
    store_totals: { store: string; total: number }[];
    total: number;
  };

  type PaymentStatus = { store: string; status: string; details: string };

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let cart = $state<CartItem[]>([]);
  let invoice = $state<Invoice | null>(null);
  let paymentResults = $state<PaymentStatus[]>([]);
  let loadingSearch = $state(false);
  let loadingInvoice = $state(false);
  let loadingPay = $state(false);
  let publicKey = $state('');
  let activeStore = $state<string | null>(null);

  const cartTotal = $derived.by(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  onMount(async () => {
    try {
      const res = await axios.get(`${backendUrl}/public-key`);
      publicKey = res.data.public_key;
    } catch (e) {
      console.error("Failed to fetch public key", e);
    }
  });

  async function searchProducts() {
    if (!query.trim()) return;
    loadingSearch = true;
    try {
      const res = await axios.get(`${backendUrl}/search`, { params: { q: query.trim() } });
      results = res.data;
    } catch (e) {
      console.error("Search failed", e);
      results = [];
    } finally {
      loadingSearch = false;
    }
  }

  function addToCart(item: SearchResult) {
    const existing = cart.find(c => c.store === item.store && c.product_id === item.id);
    if (existing) {
      existing.quantity += 1;
      cart = [...cart];
    } else {
      cart = [...cart, { store: item.store, product_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    }
  }

  function updateQuantity(item: CartItem, delta: number) {
    item.quantity = Math.max(1, item.quantity + delta);
    cart = [...cart];
  }

  async function generateInvoice() {
    if (!cart.length) return;
    loadingInvoice = true;
    try {
      const payload = { items: cart.map(({ store, product_id, quantity }) => ({ store, product_id, quantity })) };
      const res = await axios.post(`${backendUrl}/invoice`, payload);
      invoice = res.data;
      paymentResults = [];
    } catch (e) {
      console.error("Invoice failed", e);
      invoice = null;
    } finally {
      loadingInvoice = false;
    }
  }

  async function payInvoice() {
    if (!cart.length) return;
    loadingPay = true;
    paymentResults = [];
    try {
      const payload = { items: cart.map(({ store, product_id, quantity }) => ({ store, product_id, quantity })) };
      const res = await axios.post(`${backendUrl}/pay`, payload);
      paymentResults = res.data;
    } catch (e) {
      console.error("Payment failed", e);
      paymentResults = cart.map((c) => ({ store: c.store, status: 'error', details: 'Payment failed' }));
    } finally {
      loadingPay = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
  <div class="mx-auto w-full max-w-6xl px-4 py-10">
    <Card.Root class="border-border/60 bg-card/60 backdrop-blur">
      <Card.Header class="border-b border-border/60 pb-6">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingCart class="h-6 w-6" />
            </div>
            <div>
              <Card.Title class="text-2xl">UCP Agent Console</Card.Title>
              <Card.Description class="mt-1">
                Search multi-store catalogs, draft invoices, and sign AP2 mandates.
              </Card.Description>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Badge variant="secondary" class="gap-2 rounded-full px-3 py-1">
              <Sparkles class="h-3.5 w-3.5" /> Live Agent
            </Badge>
            {#if publicKey}
              <div class="flex flex-col items-end gap-1">
                <span class="text-[10px] uppercase tracking-widest text-muted-foreground">Public Key</span>
                <Badge variant="outline" class="max-w-[180px] truncate bg-muted/50 font-mono text-[10px]">
                  {publicKey}
                </Badge>
              </div>
            {/if}
          </div>
        </div>
        <div class="mt-6 flex flex-col gap-3 md:flex-row">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              class="pl-9"
              placeholder="Search across stores (e.g., laptop, hoodie)"
              bind:value={query}
              onkeydown={(e) => e.key === 'Enter' && searchProducts()}
            />
          </div>
          <Button onclick={searchProducts} disabled={loadingSearch} class="gap-2">
            {#if loadingSearch}
              <Loader2 class="h-4 w-4 animate-spin" />
              Searching
            {:else}
              <Search class="h-4 w-4" />
              Search
            {/if}
          </Button>
        </div>
      </Card.Header>

      <Card.Content class="grid gap-8 pt-8 lg:grid-cols-[1.2fr,0.8fr]">
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Results</h3>
            {#if results.length}
              <span class="text-xs text-muted-foreground">{results.length} items</span>
            {/if}
          </div>
          {#if results.length === 0}
            <div class="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Search to populate multi-store matches.
            </div>
          {:else}
            <div class="grid gap-3 md:grid-cols-2">
              {#each results as item (item.store + item.id)}
                <Card.Root class="border-border/60">
                  <Card.Header class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Badge variant="outline" class="rounded-full text-[10px] uppercase tracking-widest">
                        {item.store}
                      </Badge>
                      <span class="text-sm font-semibold">${item.price.toFixed(2)}</span>
                    </div>
                    <Card.Title class="text-base">{item.name}</Card.Title>
                    <Card.Description class="text-xs">{item.description ?? 'Curated store item.'}</Card.Description>
                  </Card.Header>
                  <Card.Footer class="justify-between">
                    <Button size="sm" variant="secondary" onclick={() => { activeStore = item.store; addToCart(item); }}>
                      Add to cart
                    </Button>
                    {#if activeStore === item.store}
                      <Badge variant="secondary" class="text-[10px]">active store</Badge>
                    {/if}
                  </Card.Footer>
                </Card.Root>
              {/each}
            </div>
          {/if}
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cart</h3>
            <span class="text-xs text-muted-foreground">{cart.length} items</span>
          </div>
          {#if cart.length === 0}
            <div class="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Add products to build an invoice.
            </div>
          {:else}
            <div class="space-y-3">
              {#each cart as item (item.store + item.product_id)}
                <div class="rounded-2xl border border-border/60 bg-card/40 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold">{item.name}</p>
                      <p class="text-xs text-muted-foreground">{item.store}</p>
                    </div>
                    <span class="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div class="mt-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Button size="icon" variant="outline" onclick={() => updateQuantity(item, -1)}>-</Button>
                      <span class="text-sm">{item.quantity}</span>
                      <Button size="icon" variant="outline" onclick={() => updateQuantity(item, 1)}>+</Button>
                    </div>
                    <span class="text-xs text-muted-foreground">${item.price.toFixed(2)} each</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <Separator />

          <div class="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Cart total</span>
              <span class="font-semibold">${cartTotal.toFixed(2)}</span>
            </div>
            <div class="flex gap-2">
              <Button class="w-full" onclick={generateInvoice} disabled={loadingInvoice || cart.length === 0}>
                {#if loadingInvoice}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Generating
                {:else}
                  Generate Invoice
                {/if}
              </Button>
              <Button class="w-full" variant="default" onclick={payInvoice} disabled={loadingPay || cart.length === 0}>
                {#if loadingPay}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Paying
                {:else}
                  Pay Invoice
                {/if}
              </Button>
            </div>
          </div>

          {#if invoice}
            <Card.Root class="border-border/60">
              <Card.Header>
                <Card.Title class="text-base">Invoice Summary</Card.Title>
                <Card.Description>Total due: ${invoice.total.toFixed(2)}</Card.Description>
              </Card.Header>
              <Card.Content class="space-y-2 text-sm">
                {#each invoice.store_totals as total (total.store)}
                  <div class="flex justify-between">
                    <span>{total.store}</span>
                    <span>${total.total.toFixed(2)}</span>
                  </div>
                {/each}
              </Card.Content>
            </Card.Root>
          {/if}

          {#if paymentResults.length}
            <div class="space-y-2">
              <div class="text-sm font-semibold">Payment Status</div>
              {#each paymentResults as res (res.store)}
                <div class="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-3">
                  <div class="text-sm">{res.store}</div>
                  {#if res.status === 'success'}
                    <Badge variant="default" class="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle2 class="h-3 w-3" /> Confirmed
                    </Badge>
                  {:else}
                    <Badge variant="destructive" class="flex items-center gap-1">
                      <XCircle class="h-3 w-3" /> {res.details}
                    </Badge>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </section>
      </Card.Content>
    </Card.Root>
  </div>
</div>
