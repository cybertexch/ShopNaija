// public/js/products.js
// Products listing logic for ShopNaija Demo

import { getSupabase } from './supabaseClient.js';
import { initHeaderAuth } from './auth.js';

// Fallback demo products in case database is offline / not yet seeded
const FALLBACK_PRODUCTS = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Handwoven Aso-Oke Agbada Set', price: 45000, image_url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Benin Bronze Replica Mask', price: 18500, image_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Organic Adire Indigo Silk Scarf', price: 12000, image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Jos Plateau Arabica Coffee (500g)', price: 8500, image_url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000005', name: 'Calabar Chili Crisp Oil (250ml)', price: 4200, image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Handcrafted Kano Leather Slippers', price: 32000, image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000007', name: 'Gourmet Smokey Jollof Spice Jar', price: 3500, image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000008', name: 'Pure Nilotica Shea Butter Cream', price: 6000, image_url: 'https://images.unsplash.com/photo-1608248597359-0d321591f822?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000009', name: 'Ankara Print Laptop Sleeve 15"', price: 9500, image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000010', name: 'Beaded Coral Choker Necklace', price: 24000, image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000011', name: 'Smoked Dried Catfish Fillet Pack', price: 15000, image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80' },
  { id: 'b0000000-0000-0000-0000-000000000012', name: 'Hand-Carved Talking Drum (Gangan)', price: 28000, image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80' }
];

export async function loadProducts() {
  await initHeaderAuth();
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="state-box" style="grid-column: 1 / -1;">
      <div class="state-spinner"></div>
      <p>Loading genuine Nigerian heritage products...</p>
    </div>
  `;

  let products = [];
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('price', { ascending: false });

      if (!error && data && data.length > 0) {
        products = data;
      } else {
        console.info('Using fallback product catalog (database empty or connecting)');
        products = FALLBACK_PRODUCTS;
      }
    } catch (e) {
      console.warn('Could not reach Supabase products table, using demo fallback:', e);
      products = FALLBACK_PRODUCTS;
    }
  } else {
    products = FALLBACK_PRODUCTS;
  }

  renderProducts(products, grid);
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
          onerror="this.src='https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80'"
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
