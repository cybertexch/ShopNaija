// public/js/products.js
// Products listing logic for ShopNaija Demo

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { initHeaderAuth } from './auth.js';

// Fallback demo products in case database is offline / not yet seeded
const FALLBACK_PRODUCTS = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Handwoven Aso-Oke Agbada Set', price: 45000, image_url: 'images/products/aso-oke.svg' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Benin Bronze Replica Mask', price: 18500, image_url: 'images/products/benin-mask.svg' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Organic Adire Indigo Silk Scarf', price: 12000, image_url: 'images/products/adire-scarf.svg' },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Jos Plateau Arabica Coffee (500g)', price: 8500, image_url: 'images/products/jos-coffee.svg' },
  { id: 'b0000000-0000-0000-0000-000000000005', name: 'Calabar Chili Crisp Oil (250ml)', price: 4200, image_url: 'images/products/calabar-chili.svg' },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Handcrafted Kano Leather Slippers', price: 32000, image_url: 'images/products/kano-leather.svg' },
  { id: 'b0000000-0000-0000-0000-000000000007', name: 'Gourmet Smokey Jollof Spice Jar', price: 3500, image_url: 'images/products/jollof-spice.svg' },
  { id: 'b0000000-0000-0000-0000-000000000008', name: 'Pure Nilotica Shea Butter Cream', price: 6000, image_url: 'images/products/shea-butter.svg' },
  { id: 'b0000000-0000-0000-0000-000000000009', name: 'Ankara Print Laptop Sleeve 15"', price: 9500, image_url: 'images/products/ankara-sleeve.svg' },
  { id: 'b0000000-0000-0000-0000-000000000010', name: 'Beaded Coral Choker Necklace', price: 24000, image_url: 'images/products/coral-necklace.svg' },
  { id: 'b0000000-0000-0000-0000-000000000011', name: 'Smoked Dried Catfish Fillet Pack', price: 15000, image_url: 'images/products/smoked-catfish.svg' },
  { id: 'b0000000-0000-0000-0000-000000000012', name: 'Hand-Carved Talking Drum (Gangan)', price: 28000, image_url: 'images/products/talking-drum.svg' }
];

export async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // 1. Instant 0ms optimistic render (no spinner, no wait, instant display!)
  renderProducts(FALLBACK_PRODUCTS, grid);

  // 2. Initialize header auth in parallel without blocking product cards
  initHeaderAuth();

  // 3. Only query remote Supabase if a real project is configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('price', { ascending: false });

        if (!error && data && data.length > 0) {
          renderProducts(data, grid);
        }
      }
    } catch (e) {
      console.info('Using local fast catalog:', e.message);
    }
  }
}

function renderProducts(products, container) {
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="state-box" style="grid-column: 1 / -1;">
        <p>No products available right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => `
    <article class="product-card" data-id="${product.id}">
      <div class="product-image-wrap">
        <img 
          src="${escapeHtml(product.image_url)}" 
          alt="${escapeHtml(product.name)}" 
          class="product-image"
          loading="lazy"
          onerror="this.src='images/products/aso-oke.svg'"
        />
      </div>
      <div class="product-details">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-price">₦${Number(product.price).toLocaleString()}</div>
        <button class="btn btn-primary btn-sm btn-block" onclick="window.location.href='orders.html'">
          View My Orders
        </button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

document.addEventListener('DOMContentLoaded', loadProducts);
