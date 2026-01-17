<script lang="ts">
  import { onMount } from 'svelte';
  import Card, { Content, Actions } from '@smui/card';
  import Button from '@smui/button';
  import TextField from '@smui/textfield';

  type Product = {
    id: string;
    name: string;
    description?: string | null;
    price: number;
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

<div class="page">
  <header class="hero">
    <div>
      <p class="eyebrow">Store Beta</p>
      <h1>Home & Kitchen Lab</h1>
      <p class="sub">Smart home essentials and kitchen gear with verified checkout.</p>
    </div>
    <div class="search">
      <TextField label="Search products" bind:value={query} />
      <Button variant="raised" on:click={loadProducts}>Search</Button>
    </div>
  </header>

  <section class="content">
    <div class="grid">
      <div class="section-title">
        <h2>Catalog</h2>
        {#if loading}<span>Loading...</span>{/if}
      </div>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      <div class="cards">
        {#each products as product (product.id)}
          <div class="card">
            <Card variant="outlined">
              <Content>
                <p class="category">{product.category?.name ?? 'General'}</p>
                <h3>{product.name}</h3>
                <p class="description">{product.description ?? 'Signature pick for your home.'}</p>
                <p class="price">${product.price.toFixed(2)}</p>
              </Content>
              <div class="actions">
                <Actions>
                  <Button on:click={() => addToCart(product)}>Add to cart</Button>
                </Actions>
              </div>
            </Card>
          </div>
        {/each}
      </div>
    </div>

    <aside class="cart">
      <h2>Cart</h2>
      {#if cart.length === 0}
        <p class="muted">Nothing here yet.</p>
      {:else}
        <div class="cart-items">
          {#each cart as item (item.id)}
            <div class="cart-row">
              <div>
                <p class="item-name">{item.name}</p>
                <p class="muted">${item.price.toFixed(2)} each</p>
              </div>
              <div class="qty">
                <Button variant="outlined" on:click={() => updateQty(item.id, -1)}>-</Button>
                <span>{item.qty}</span>
                <Button variant="outlined" on:click={() => updateQty(item.id, 1)}>+</Button>
              </div>
            </div>
          {/each}
        </div>
        <div class="total">
          <span>Subtotal</span>
          <strong>${cartTotal.toFixed(2)}</strong>
        </div>
        <Button variant="raised" style="width: 100%;">Request Invoice</Button>
      {/if}
    </aside>
  </section>
</div>

<style>
  .page {
    min-height: 100vh;
    background: #f7f7f9;
    color: #1f1f1f;
    padding: 2.5rem 2rem 3rem;
  }
  .hero {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }
  .hero h1 {
    font-size: 2.2rem;
    margin: 0.4rem 0 0.6rem;
  }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-size: 0.75rem;
    color: #7b7b8a;
  }
  .sub {
    color: #5c5c6a;
    max-width: 40rem;
  }
  .search {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2rem;
  }
  .cards {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .card {
    padding: 0.5rem;
  }
  .category {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.65rem;
    color: #8a8a96;
  }
  .description {
    color: #5c5c6a;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
  .price {
    margin-top: 0.8rem;
    font-weight: 600;
  }
  .actions {
    padding: 0 0.5rem 0.8rem;
  }
  .cart {
    background: #fff;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 16px 30px rgba(20, 20, 40, 0.08);
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
    gap: 0.5rem;
    align-items: center;
  }
  .total {
    margin-top: 1.5rem;
    display: flex;
    justify-content: space-between;
  }
  .muted {
    color: #7b7b8a;
    font-size: 0.9rem;
  }
  .error {
    padding: 0.75rem 1rem;
    background: #fff2f2;
    border-radius: 12px;
    color: #a43c3c;
    margin: 1rem 0;
  }
  @media (max-width: 960px) {
    .content {
      grid-template-columns: 1fr;
    }
  }
</style>
