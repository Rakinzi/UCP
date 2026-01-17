<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, TextField } from '@steeze-ui/components';

  type Product = {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    category?: { name: string };
  };

  let query = $state('');
  let products = $state<Product[]>([]);
  let loading = $state(false);
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

<div class="shell">
  <header class="hero">
    <div>
      <p class="eyebrow">Store Gamma</p>
      <h1>Apparel & Fitness Supply</h1>
      <p class="sub">Minimalist essentials, verified through UCP.</p>
    </div>
    <div class="search">
      <TextField label="Search products" bind:value={query} />
      <Button theme="primary" on:click={loadProducts}>Search</Button>
    </div>
  </header>

  <main class="layout">
    <section class="catalog">
      <div class="section-title">
        <h2>New drops</h2>
        {#if loading}<span>Loading...</span>{/if}
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="grid">
        {#each products as product (product.id)}
          <article class="card">
            <div class="card-header">
              <span class="tag">{product.category?.name ?? 'General'}</span>
              <span class="price">${product.price.toFixed(2)}</span>
            </div>
            <h3>{product.name}</h3>
            <p>{product.description ?? 'Built for daily routines.'}</p>
            <Button theme="secondary" on:click={() => addToCart(product)}>Add to cart</Button>
          </article>
        {/each}
      </div>
    </section>

    <aside class="cart">
      <h2>Cart</h2>
      {#if cart.length === 0}
        <p class="muted">No items yet.</p>
      {:else}
        <div class="cart-items">
          {#each cart as item (item.id)}
            <div class="cart-row">
              <div>
                <p class="item-name">{item.name}</p>
                <p class="muted">${item.price.toFixed(2)} each</p>
              </div>
              <div class="qty">
                <Button theme="ghost" on:click={() => updateQty(item.id, -1)}>-</Button>
                <span>{item.qty}</span>
                <Button theme="ghost" on:click={() => updateQty(item.id, 1)}>+</Button>
              </div>
            </div>
          {/each}
        </div>
        <div class="total">
          <span>Subtotal</span>
          <strong>${cartTotal.toFixed(2)}</strong>
        </div>
        <Button theme="primary" style="width: 100%;">Request Invoice</Button>
      {/if}
    </aside>
  </main>
</div>

<style>
  .shell {
    min-height: 100vh;
    background: radial-gradient(circle at top, #f4f4f6 0%, #ffffff 60%);
    color: #10121a;
    padding: 2.5rem 2rem 3rem;
  }
  .hero {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-size: 0.75rem;
    color: #7c7f8a;
  }
  h1 {
    font-size: 2.3rem;
    margin: 0.4rem 0 0.6rem;
  }
  .sub {
    color: #5c5f6a;
  }
  .search {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .layout {
    margin-top: 2.5rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2rem;
  }
  .grid {
    margin-top: 1.5rem;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  }
  .card {
    border: 1px solid #e3e4ea;
    border-radius: 16px;
    padding: 1.2rem;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .tag {
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #6f7280;
  }
  .price {
    font-weight: 600;
  }
  .cart {
    border: 1px solid #e3e4ea;
    border-radius: 16px;
    padding: 1.5rem;
    background: #fff;
  }
  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }
  .cart-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .qty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .total {
    margin-top: 1.5rem;
    display: flex;
    justify-content: space-between;
  }
  .muted {
    color: #7c7f8a;
    font-size: 0.9rem;
  }
  .error {
    margin-top: 1rem;
    background: #fff4f4;
    border: 1px solid #f1c4c4;
    color: #b14646;
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }
  @media (max-width: 960px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
