// public/js/cart.js
// Shopping Bag & Quick Checkout Modal for ShopNaija Demo
// Handles cart state, slide-out drawer, and order placement with delivery notes (VULN-4 Stored XSS)

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

const STORAGE_KEY = 'SHOPNAIJA_CART';
const SHIPPING_FEE = 2500;

export function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    renderCartItems();
  } catch (e) {
    console.warn('Failed to save cart:', e);
  }
}

export async function addToCart(product, qty = 1) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      quantity: qty
    });
  }
  saveCart(cart);
  openCart();
}

export function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

export function updateQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    saveCart(cart);
  }
}

export function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  updateCartBadge();
  renderCartItems();
}

export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count-badge');
  const count = getCartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'inline-block' : 'none';
  });
}

export function openCart() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer && backdrop) {
    renderCartItems();
    drawer.classList.add('open');
    backdrop.classList.add('open');
  }
}

export function closeCart() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

export function openCheckout() {
  closeCart();
  const modal = document.getElementById('checkout-modal');
  if (modal) {
    const total = getCartTotal();
    const grandTotal = total > 0 ? total + SHIPPING_FEE : 0;
    
    document.getElementById('checkout-subtotal').textContent = `₦${total.toLocaleString()}`;
    document.getElementById('checkout-total').textContent = `₦${grandTotal.toLocaleString()}`;
    
    // Autofill user details if available
    getCurrentUser().then(user => {
      if (user) {
        const nameField = document.getElementById('delivery_name');
        if (nameField && !nameField.value) nameField.value = user.fullName || '';
      }
    });

    modal.classList.add('open');
  }
}

export function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.remove('open');
}

function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  const footer = document.getElementById('cart-drawer-footer');
  if (!container || !footer) return;

  const cart = getCart();
  const subtotal = getCartTotal();
  const grandTotal = subtotal > 0 ? subtotal + SHIPPING_FEE : 0;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <p style="font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Your bag is empty</p>
        <p style="font-size: 0.85rem;">Explore our curated Nigerian heritage catalog and add handcrafted items.</p>
      </div>
    `;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  document.getElementById('cart-subtotal-val').textContent = `₦${subtotal.toLocaleString()}`;
  document.getElementById('cart-total-val').textContent = `₦${grandTotal.toLocaleString()}`;

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" class="cart-item-img" onerror="this.src='images/products/aso-oke.svg'" />
      <div class="cart-item-info">
        <div class="cart-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">₦${Number(item.price).toLocaleString()}</div>
      </div>
      <div class="cart-qty-ctrl">
        <button class="cart-qty-btn cart-btn-minus" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
        <span class="cart-qty-val">${item.quantity}</span>
        <button class="cart-qty-btn cart-btn-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
      </div>
      <button class="cart-item-del" data-id="${item.id}" title="Remove item" aria-label="Remove item">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Attach item control listeners
  container.querySelectorAll('.cart-btn-minus').forEach(btn => {
    btn.addEventListener('click', () => updateQuantity(btn.dataset.id, -1));
  });
  container.querySelectorAll('.cart-btn-plus').forEach(btn => {
    btn.addEventListener('click', () => updateQuantity(btn.dataset.id, 1));
  });
  container.querySelectorAll('.cart-item-del').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

export function initCartUI() {
  if (document.getElementById('cart-drawer')) return;

  // 1. Mount Cart Drawer & Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'cart-backdrop';
  backdrop.className = 'cart-backdrop';
  document.body.appendChild(backdrop);

  const drawer = document.createElement('aside');
  drawer.id = 'cart-drawer';
  drawer.className = 'cart-drawer';
  drawer.setAttribute('aria-label', 'Shopping Bag');
  drawer.innerHTML = `
    <div class="cart-header">
      <div class="cart-header-title">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <span>Shopping Bag</span>
      </div>
      <button class="cart-close-btn" id="cart-close-btn" aria-label="Close cart">&times;</button>
    </div>

    <div class="cart-body" id="cart-items-container">
      <!-- Items dynamically populated -->
    </div>

    <div class="cart-footer" id="cart-drawer-footer">
      <div class="cart-summary-row">
        <span>Items Subtotal</span>
        <span id="cart-subtotal-val">₦0</span>
      </div>
      <div class="cart-summary-row">
        <span>Express Delivery</span>
        <span>₦2,500</span>
      </div>
      <div class="cart-summary-total">
        <span>Total Due</span>
        <span id="cart-total-val" style="color: var(--color-primary);">₦0</span>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="cart-checkout-btn">
        Proceed to Checkout &rarr;
      </button>
    </div>
  `;
  document.body.appendChild(drawer);

  // 2. Mount Quick Checkout Modal
  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'checkout-modal';
  modal.setAttribute('aria-label', 'Express Checkout');
  modal.innerHTML = `
    <div class="checkout-modal-card">
      <div class="checkout-modal-header">
        <div>
          <h2 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--color-text-main); margin-bottom: 2px;">
            Order Checkout &amp; Dispatch
          </h2>
          <p style="font-size: 0.85rem; color: var(--color-text-muted);">
            Provide courier shipping destination and order notes.
          </p>
        </div>
        <button class="cart-close-btn" id="checkout-close-btn" aria-label="Close checkout">&times;</button>
      </div>

      <form id="checkout-form">
        <div class="form-group">
          <label class="form-label" for="delivery_name">Recipient Full Name *</label>
          <input type="text" id="delivery_name" class="form-input" placeholder="e.g. Chidi Okafor" required autocomplete="name" />
        </div>

        <div class="form-group">
          <label class="form-label" for="delivery_phone">Phone Number *</label>
          <input type="tel" id="delivery_phone" class="form-input" placeholder="e.g. +234 800 000 0001" required autocomplete="tel" />
        </div>

        <div class="form-group">
          <label class="form-label" for="delivery_address">Delivery Address (Street, City, State) *</label>
          <input type="text" id="delivery_address" class="form-input" placeholder="e.g. 12 Marina Street, Lagos Island, Lagos" required autocomplete="street-address" />
        </div>

        <!-- TARGET FORM FIELD FOR VULN-4 (STORED XSS DEMONSTRATION) -->
        <div class="form-group">
          <label class="form-label" for="delivery_notes">
            Delivery Instructions &amp; Gift Notes
            <span style="font-weight: 400; font-size: 0.8rem; color: var(--color-text-muted);">(Optional)</span>
          </label>
          <textarea 
            id="delivery_notes" 
            class="form-input" 
            rows="3" 
            placeholder="Special courier instructions, landmark notes, or custom gift card message..."
            style="resize: vertical; min-height: 70px;"
          ></textarea>
        </div>

        <div style="background: var(--color-surface-alt); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
            <span style="color: var(--color-text-muted);">Payment Method:</span>
            <strong>Cash / Bank Transfer on Delivery (Demo)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
            <span style="color: var(--color-text-muted);">Subtotal:</span>
            <span id="checkout-subtotal">₦0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
            <span style="color: var(--color-text-muted);">Shipping:</span>
            <span>₦2,500</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 1px solid var(--color-border); padding-top: 6px; margin-top: 6px;">
            <span>Total Payable:</span>
            <span id="checkout-total" style="color: var(--color-primary);">₦0</span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-lg" id="checkout-submit-btn">
          Confirm &amp; Dispatch Order
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // 3. Attach Events
  backdrop.addEventListener('click', () => {
    closeCart();
    closeCheckout();
  });
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
  document.getElementById('checkout-close-btn')?.addEventListener('click', closeCheckout);
  document.getElementById('cart-checkout-btn')?.addEventListener('click', openCheckout);

  document.getElementById('checkout-form')?.addEventListener('submit', handleCheckoutSubmit);

  // Initialize badge
  updateCartBadge();
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('checkout-submit-btn');
  const cart = getCart();

  if (cart.length === 0) {
    alert('Your bag is empty.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing Order...';

  const name = document.getElementById('delivery_name').value.trim();
  const phone = document.getElementById('delivery_phone').value.trim();
  const address = document.getElementById('delivery_address').value.trim();
  // VULN-4 Target Field:
  const notes = document.getElementById('delivery_notes').value;

  const user = await getCurrentUser();
  const userId = user ? user.id : 'c0000000-0000-0000-0000-000000000001';
  const newOrderId = 'd0000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

  const primaryItem = cart[0];
  const totalAmount = getCartTotal() + SHIPPING_FEE;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const productSummary = cart.length === 1 
    ? `${cart[0].name}${cart[0].quantity > 1 ? ` (×${cart[0].quantity})` : ''}`
    : `${cart[0].name} + ${cart.length - 1} other item${cart.length > 2 ? 's' : ''}`;

  const newOrder = {
    id: newOrderId,
    user_id: userId,
    product_id: primaryItem.id,
    quantity: totalItemsCount,
    total: totalAmount,
    delivery_name: name,
    delivery_phone: phone,
    delivery_address: address,
    delivery_notes: notes,
    status: 'Processing',
    created_at: new Date().toISOString(),
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image_url: item.image_url
    })),
    products: {
      name: productSummary,
      price: primaryItem.price,
      image_url: primaryItem.image_url
    }
  };

  // 1. Save to localStorage for instant local demo persistence
  try {
    const existingRaw = localStorage.getItem('SHOPNAIJA_LOCAL_ORDERS');
    const existingOrders = existingRaw ? JSON.parse(existingRaw) : [];
    existingOrders.unshift(newOrder);
    localStorage.setItem('SHOPNAIJA_LOCAL_ORDERS', JSON.stringify(existingOrders));
  } catch (err) {
    console.warn('Local order storage failed:', err);
  }

  // 2. Insert into remote Supabase if connected
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const targetUserId = user ? user.id : 'c0000000-0000-0000-0000-000000000001';
        const supabaseRows = cart.map((cartItem, idx) => ({
          id: idx === 0 ? newOrderId : ('d0000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString()),
          user_id: targetUserId,
          product_id: cartItem.id,
          quantity: cartItem.quantity,
          total: idx === 0 ? totalAmount : (Number(cartItem.price) * cartItem.quantity),
          delivery_name: name,
          delivery_phone: phone,
          delivery_address: address,
          delivery_notes: notes,
          status: 'Processing'
        }));

        const { error: insErr } = await supabase.from('orders').insert(supabaseRows);
        if (insErr) {
          console.warn('Supabase order insert notice:', insErr.message);
        } else {
          console.log('Successfully recorded orders to Supabase:', supabaseRows.length);
        }
      }
    } catch (err) {
      console.info('Supabase insert skipped or offline:', err.message);
    }
  }

  // 3. Clear cart & redirect to order confirmation
  clearCart();
  closeCheckout();
  window.location.href = `order.html?id=${newOrderId}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
