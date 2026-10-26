import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { initHeaderAuth } from './auth.js';
import { initCartUI, addToCart, openCart } from './cart.js?v=3';

// Fallback demo products with rich presentation metadata
const FALLBACK_PRODUCTS = [
  { 
    id: 'b0000000-0000-0000-0000-000000000001', 
    name: 'Handwoven Aso-Oke Agbada Set', 
    price: 45000, 
    oldPrice: 52000,
    category: 'textiles',
    rating: '4.9',
    reviews: 142,
    badge: 'Royal Heritage',
    stock: 'In Stock • Ships Today',
    image_url: 'images/products/aso-oke.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000002', 
    name: 'Benin Bronze Replica Mask', 
    price: 18500, 
    oldPrice: 22000,
    category: 'art',
    rating: '5.0',
    reviews: 98,
    badge: 'Museum Grade',
    stock: 'Artisan Crafted',
    image_url: 'images/products/benin-mask.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000003', 
    name: 'Organic Adire Indigo Silk Scarf', 
    price: 12000, 
    oldPrice: 15000,
    category: 'textiles',
    rating: '4.8',
    reviews: 76,
    badge: 'Bestseller',
    stock: 'Natural Indigo Dye',
    image_url: 'images/products/adire-scarf.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000004', 
    name: 'Jos Plateau Arabica Coffee (500g)', 
    price: 8500, 
    oldPrice: 9800,
    category: 'gourmet',
    rating: '4.9',
    reviews: 189,
    badge: 'Single Origin',
    stock: 'Fresh Roast',
    image_url: 'images/products/jos-coffee.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000005', 
    name: 'Calabar Chili Crisp Oil (250ml)', 
    price: 4200, 
    oldPrice: 5000,
    category: 'gourmet',
    rating: '4.9',
    reviews: 215,
    badge: 'Chef Favorite',
    stock: 'In Stock',
    image_url: 'images/products/calabar-chili.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000006', 
    name: 'Handcrafted Kano Leather Slippers', 
    price: 32000, 
    oldPrice: 38000,
    category: 'lifestyle',
    rating: '4.8',
    reviews: 64,
    badge: 'Northern Heritage',
    stock: 'Genuine Goat Leather',
    image_url: 'images/products/kano-leather.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000007', 
    name: 'Gourmet Smokey Jollof Spice Jar', 
    price: 3500, 
    oldPrice: 4000,
    category: 'gourmet',
    rating: '5.0',
    reviews: 320,
    badge: 'Top Rated',
    stock: 'Wood-Smoked Herbs',
    image_url: 'images/products/jollof-spice.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000008', 
    name: 'Pure Nilotica Shea Butter Cream', 
    price: 6000, 
    oldPrice: 7500,
    category: 'lifestyle',
    rating: '4.9',
    reviews: 154,
    badge: '100% Organic',
    stock: 'Cold-Pressed',
    image_url: 'images/products/shea-butter.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000009', 
    name: 'Ankara Print Laptop Sleeve 15"', 
    price: 9500, 
    oldPrice: 12000,
    category: 'lifestyle',
    rating: '4.7',
    reviews: 88,
    badge: 'Padded Protection',
    stock: 'Water Resistant',
    image_url: 'images/products/ankara-sleeve.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000010', 
    name: 'Beaded Coral Choker Necklace', 
    price: 24000, 
    oldPrice: 28000,
    category: 'lifestyle',
    rating: '4.9',
    reviews: 110,
    badge: 'Artisan Choice',
    stock: 'Natural Edo Coral',
    image_url: 'images/products/coral-necklace.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000011', 
    name: 'Smoked Dried Catfish Fillet Pack', 
    price: 15000, 
    oldPrice: 17500,
    category: 'gourmet',
    rating: '4.8',
    reviews: 132,
    badge: 'Delta Fresh',
    stock: 'Vacuum Sealed',
    image_url: 'images/products/smoked-catfish.svg' 
  },
  { 
    id: 'b0000000-0000-0000-0000-000000000012', 
    name: 'Hand-Carved Talking Drum (Gangan)', 
    price: 28000, 
    oldPrice: 34000,
    category: 'art',
    rating: '5.0',
    reviews: 95,
    badge: 'Master Carver',
    stock: 'Tuned Hardwood',
    image_url: 'images/products/talking-drum.svg' 
  }
];

let currentProductsList = [...FALLBACK_PRODUCTS];
let activeCategory = 'all';

export async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // 1. Instant 0ms optimistic render with luxury cards
  renderProducts(currentProductsList, grid);

  // 2. Set up category filter chips
  setupCategoryFilters(grid);

  // 3. Initialize header auth in parallel
  initHeaderAuth();

  // 4. Initialize Cart UI & trigger
  initCartUI();
  document.getElementById('cart-trigger-btn')?.addEventListener('click', openCart);

  // 4. Query remote Supabase if connected
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('price', { ascending: false });

        if (!error && data && data.length > 0) {
          // Merge remote data with local luxury metadata
          currentProductsList = data.map((remoteItem, index) => {
            const fallbackMatch = FALLBACK_PRODUCTS.find(p => p.id === remoteItem.id || p.name === remoteItem.name) 
              || FALLBACK_PRODUCTS[index % FALLBACK_PRODUCTS.length];
            return {
              ...fallbackMatch,
              ...remoteItem,
              image_url: remoteItem.image_url || fallbackMatch.image_url
            };
          });
          applyCurrentFilter(grid);
        }
      }
    } catch (e) {
      console.info('Using local fast catalog:', e.message);
    }
  }
}

function setupCategoryFilters(grid) {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.dataset.category || 'all';
      applyCurrentFilter(grid);
    });
  });
}

function applyCurrentFilter(grid) {
  if (activeCategory === 'all') {
    renderProducts(currentProductsList, grid);
  } else {
    const filtered = currentProductsList.filter(p => p.category === activeCategory);
    renderProducts(filtered, grid);
  }
}

function renderProducts(products, container) {
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="state-box" style="grid-column: 1 / -1; padding: 3rem 1rem;">
        <p style="font-size: 1.1rem; color: var(--color-text-muted);">No products found in this collection.</p>
        <button class="btn btn-outline btn-sm" onclick="document.querySelector('.filter-chip[data-category=\\'all\\']').click()" style="margin-top: 1rem;">
          View All Items
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    const ratingStars = '★'.repeat(Math.floor(Number(product.rating || 5)));
    const discountPct = product.oldPrice && product.oldPrice > product.price 
      ? Math.round((1 - (product.price / product.oldPrice)) * 100) 
      : 0;

    return `
      <article class="product-card" data-id="${product.id}" data-category="${product.category || 'all'}">
        <div class="product-image-wrap">
          ${product.badge ? `<span class="product-badge-pill">${escapeHtml(product.badge)}</span>` : ''}
          ${product.stock ? `<span class="product-stock-tag">${escapeHtml(product.stock)}</span>` : ''}
          <img 
            src="${escapeHtml(product.image_url)}" 
            alt="${escapeHtml(product.name)}" 
            class="product-image"
            loading="lazy"
            onerror="this.src='images/products/aso-oke.svg'"
          />
        </div>
        <div class="product-details">
          <div class="product-rating">
            <span class="stars">${ratingStars}</span>
            <span style="font-weight: 700; color: var(--color-text-main);">${product.rating || '4.9'}</span>
            <span class="rating-count">(${product.reviews || 95})</span>
          </div>

          <h3 class="product-name">${escapeHtml(product.name)}</h3>

          <div class="price-container">
            <span class="product-price">₦${Number(product.price).toLocaleString()}</span>
            ${product.oldPrice ? `
              <span class="product-old-price">₦${Number(product.oldPrice).toLocaleString()}</span>
              ${discountPct > 0 ? `<span class="discount-badge">Save ${discountPct}%</span>` : ''}
            ` : ''}
          </div>

          <button class="btn btn-primary btn-block btn-add-cart" style="gap: 8px; justify-content: center;" data-id="${product.id}" id="btn-order-${product.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>Add to Bag</span>
          </button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.dataset.id;
      const prod = currentProductsList.find(p => p.id === prodId);
      if (prod) addToCart(prod);
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

document.addEventListener('DOMContentLoaded', loadProducts);
