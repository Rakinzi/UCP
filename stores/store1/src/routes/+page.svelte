<script lang="ts">
  import { onMount } from 'svelte';

  type Product = {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    category?: { name: string };
  };

  let query = $state('');
  let loading = $state(false);
  let products = $state<Product[]>([]);
  let cart = $state<{ id: string; name: string; price: number; qty: number }[]>([]);
  let error = $state('');

  const cartTotal = $derived.by(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  async function loadProducts() {
    loading = true;
    error = '';
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const res = await fetch(`/api/products${params}`);
      if (!res.ok) throw new Error('Failed to load products');
      products = await res.json();
    } catch (e) {
      console.error(e);
      error = 'Unable to load products right now.';
    } finally {
      loading = false;
    }
  }

  function addToCart(product: Product) {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += 1;
      cart = [...cart];
    } else {
      cart = [...cart, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    }
  }

  function updateQty(id: string, delta: number) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    cart = [...cart];
  }

  onMount(loadProducts);
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
  <section class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Store Alpha</p>
        <h1 class="mt-2 text-3xl font-semibold">Tech & Accessories</h1>
        <p class="mt-2 text-slate-600">Curated gear with fast AP2 checkout.</p>
      </div>
      <div class="flex w-full gap-3 md:w-auto">
        <input
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none md:w-72"
          placeholder="Search products"
          bind:value={query}
          onkeydown={(e) => e.key === 'Enter' && loadProducts()}
        />
        <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onclick={loadProducts}>
          Search
        </button>
      </div>
    </div>

    <div class="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
      <div>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Featured Products</h2>
          {#if loading}
            <span class="text-sm text-slate-500">Loading...</span>
          {/if}
        </div>

        {#if error}
          <div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        {/if}

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          {#each products as product (product.id)}
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs uppercase tracking-wide text-slate-400">{product.category?.name ?? 'General'}</p>
                  <h3 class="mt-2 text-base font-semibold">{product.name}</h3>
                  <p class="mt-1 text-sm text-slate-500">{product.description ?? 'Signature pick for your setup.'}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              <button class="mt-4 w-full rounded-xl border border-slate-900 px-4 py-2 text-sm font-semibold" onclick={() => addToCart(product)}>
                Add to cart
              </button>
            </div>
          {/each}
        </div>
      </div>

      <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-lg font-semibold">Cart</h3>
        {#if cart.length === 0}
          <p class="mt-4 text-sm text-slate-500">Your cart is empty.</p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each cart as item (item.id)}
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">{item.name}</p>
                  <p class="text-xs text-slate-400">${item.price.toFixed(2)} each</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="h-7 w-7 rounded-full border border-slate-200 text-sm" onclick={() => updateQty(item.id, -1)}>-</button>
                  <span class="text-sm">{item.qty}</span>
                  <button class="h-7 w-7 rounded-full border border-slate-200 text-sm" onclick={() => updateQty(item.id, 1)}>+</button>
                </div>
              </div>
            {/each}
          </div>
          <div class="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
            <span class="text-sm text-slate-500">Subtotal</span>
            <span class="text-base font-semibold">${cartTotal.toFixed(2)}</span>
          </div>
          <button class="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Request Invoice
          </button>
        {/if}
      </aside>
    </div>
  </section>
</div>
