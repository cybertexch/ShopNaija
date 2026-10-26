// public/js/orders.js
// Orders listing and Order Detail logic for ShopNaija Demo
// Demonstrates VULN-1 (Broken Access Control / IDOR)

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { requireAuth, initHeaderAuth } from './auth.js';

// Fallback demo orders for offline/local preview if Supabase is disconnected
const FALLBACK_ORDERS = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    user_id: 'c0000000-0000-0000-0000-000000000001',
    quantity: 1,
    total: 45000,
    delivery_name: 'Chidi Okafor',
    delivery_address: '12 Fake Marina Street, Lagos Island, Lagos',
    delivery_phone: '+234 800 000 0001',
    status: 'Processing',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    products: { name: 'Handwoven Aso-Oke Agbada Set', price: 45000, image_url: 'images/products/aso-oke.svg' }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    user_id: 'c0000000-0000-0000-0000-000000000002', // Different user (Amina Bello) - IDOR Target
    quantity: 1,
    total: 24000,
    delivery_name: 'Amina Bello (Confidential Customer)',
    delivery_address: 'Plot 404 Nowhere Close, Maitama, Abuja FCT',
    delivery_phone: '+234 800 111 2222',
    status: 'Shipped',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    products: { name: 'Beaded Coral Choker Necklace', price: 24000, image_url: 'images/products/coral-necklace.svg' }
  }
];

// ==============================================================================
// 1. Load Orders List (orders.html)
// ==============================================================================
export async function loadMyOrders() {
  await initHeaderAuth();
  const user = await requireAuth();
  if (!user) return;

  const container = document.getElementById('orders-tbody');
  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="6" class="state-box">
        <div class="state-spinner"></div>
        <p>Loading your orders...</p>
      </td>
    </tr>
  `;

  let orders = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            quantity,
            total,
            delivery_name,
            status,
            created_at,
            products (
              id,
              name,
              price,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          orders = data;
        } else {
          orders = FALLBACK_ORDERS.filter(o => o.user_id === user.id || o.user_id === 'c0000000-0000-0000-0000-000000000001');
        }
      } catch (e) {
        console.warn('Supabase query failed, falling back:', e);
        orders = FALLBACK_ORDERS;
      }
    }
  } else {
    // Instant demo fallback (0ms)
    orders = FALLBACK_ORDERS.filter(o => o.user_id === user.id || o.user_id === 'c0000000-0000-0000-0000-000000000001');
  }

  // Merge locally placed orders so newly placed orders always show up immediately
  const localOrdersRaw = localStorage.getItem('SHOPNAIJA_LOCAL_ORDERS');
  const localOrders = localOrdersRaw ? JSON.parse(localOrdersRaw) : [];
  const relevantLocal = localOrders.filter(o => !user || o.user_id === user.id || o.user_id === 'c0000000-0000-0000-0000-000000000001');

  const combinedOrders = [...relevantLocal];
  orders.forEach(o => {
    if (!combinedOrders.some(c => c.id === o.id)) {
      combinedOrders.push(o);
    }
  });

  renderOrdersTable(combinedOrders, container);
}

function renderOrdersTable(orders, container) {
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="state-box">
          <p>You have not placed any orders yet.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const productName = order.products?.name || 'Handwoven Aso-Oke Agbada';
    const dateFormatted = new Date(order.created_at).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return `
      <tr>
        <td><code>${order.id.substring(0, 8)}...</code></td>
        <td><strong>${escapeHtml(productName)}</strong></td>
        <td>₦${Number(order.total).toLocaleString()}</td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td>${dateFormatted}</td>
        <td>
          <a href="order.html?id=${order.id}" class="btn btn-outline btn-sm">
            View Details &rarr;
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// ==============================================================================
// 2. Load Single Order Detail (order.html) - IDOR Target
// ==============================================================================
export async function loadOrderDetail() {
  await initHeaderAuth();
  const user = await requireAuth();
  if (!user) return;

  const card = document.getElementById('order-detail-container');
  if (!card) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (!orderId) {
    card.innerHTML = `
      <div class="state-box">
        <p class="alert alert-danger" style="display:block;">No order ID provided in URL.</p>
        <a href="orders.html" class="btn btn-primary" style="margin-top:1rem;">Back to My Orders</a>
      </div>
    `;
    return;
  }

  card.innerHTML = `
    <div class="state-box">
      <div class="state-spinner"></div>
      <p>Fetching order details...</p>
    </div>
  `;

  const supabase = getSupabase();
  let order = null;
  let fetchError = null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        // ============================================================================
        // // VULN-1: BROKEN ACCESS CONTROL (IDOR)
        // The frontend directly requests the order by UUID without checking ownership.
        // Under vulnerable RLS (vulnerable.sql), the server allows ANY authenticated
        // user to read this order, exposing Customer B's delivery details to Customer A!
        // Under fixed RLS (fixed.sql), Supabase returns an error or empty result.
        // ============================================================================
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            quantity,
            total,
            delivery_name,
            delivery_address,
            delivery_phone,
            status,
            created_at,
            products (
              id,
              name,
              price,
              image_url
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) {
          fetchError = error;
        } else {
          order = data;
        }
      } catch (e) {
        fetchError = e;
      }
    }
  }

  // Check local orders fallback if not found in Supabase
  if (!order) {
    const localOrders = JSON.parse(localStorage.getItem('SHOPNAIJA_LOCAL_ORDERS') || '[]');
    order = localOrders.find(o => o.id === orderId);
  }

  if (!order && !isSupabaseConfigured()) {
    order = FALLBACK_ORDERS.find(o => o.id === orderId) || FALLBACK_ORDERS[0];
  }

  if (!order) {
    card.innerHTML = `
      <div class="state-box">
        <div class="alert alert-danger" style="display:block;">
          <strong>Access Denied or Order Not Found</strong>
          <p style="margin-top:4px;">${fetchError ? escapeHtml(fetchError.message) : 'Order could not be loaded.'}</p>
        </div>
        <a href="orders.html" class="btn btn-primary" style="margin-top:1.5rem;">Return to My Orders</a>
      </div>
    `;
    return;
  }

  renderOrderDetail(order, user, card);
}

function renderOrderDetail(order, currentUser, container) {
  const isOwner = currentUser.id === order.user_id;
  const formattedDate = new Date(order.created_at).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const itemsList = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : [{
        name: order.products?.name || 'Handcrafted Nigerian Heritage Product',
        price: order.products?.price || order.total,
        quantity: order.quantity || 1,
        image_url: order.products?.image_url || 'images/products/aso-oke.svg'
      }];

  container.innerHTML = `
    <div class="order-detail-header">
      <div>
        <div style="font-size:0.85rem; color:var(--color-text-muted); text-transform:uppercase; font-weight:700;">
          Order Reference
        </div>
        <h2 style="font-family:var(--font-heading); font-size:1.4rem; color:var(--color-text-main);">
          #${order.id}
        </h2>
        <div style="font-size:0.85rem; color:var(--color-text-muted); margin-top:2px;">
          Placed on ${formattedDate}
        </div>
      </div>
      <div>
        <span class="status-badge status-${order.status}" style="font-size:0.9rem; padding: 5px 12px;">
          ${order.status}
        </span>
      </div>
    </div>

    <!-- Product Items List -->
    <div class="detail-section">
      <div class="detail-section-title">Purchased Items (${itemsList.length})</div>
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        ${itemsList.map(item => `
          <div style="display:flex; align-items:center; gap:1rem; padding:1rem; background:var(--color-surface-alt); border-radius:var(--radius-md); border:1px solid var(--color-border);">
            <img src="${escapeHtml(item.image_url || 'images/products/aso-oke.svg')}" alt="${escapeHtml(item.name)}" style="width:64px; height:64px; object-fit:cover; border-radius:var(--radius-sm);" onerror="this.src='images/products/aso-oke.svg'" />
            <div style="flex:1;">
              <h4 style="font-size:1.05rem; font-weight:700;">${escapeHtml(item.name)}</h4>
              <p style="color:var(--color-text-muted); font-size:0.9rem;">Qty: ${item.quantity || 1} &times; ₦${Number(item.price).toLocaleString()}</p>
            </div>
            <div style="font-size:1.15rem; font-weight:800; color:var(--color-primary);">
              ₦${(Number(item.price) * (item.quantity || 1)).toLocaleString()}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; padding-top:0.75rem; border-top:1px dashed var(--color-border); font-size:1.15rem; font-weight:800;">
        <span>Order Grand Total:</span>
        <span style="color:var(--color-primary);">₦${Number(order.total).toLocaleString()}</span>
      </div>
    </div>

    <!-- Delivery & Customer Information (Exposed PII via IDOR) -->
    <div class="detail-section">
      <div class="detail-section-title">Delivery & Recipient Information</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Recipient Name</div>
          <div class="detail-value">${escapeHtml(order.delivery_name)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Contact Phone</div>
          <div class="detail-value">${escapeHtml(order.delivery_phone)}</div>
        </div>
        <div class="detail-item" style="grid-column: 1 / -1;">
          <div class="detail-label">Delivery Address</div>
          <div class="detail-value">${escapeHtml(order.delivery_address)}</div>
        </div>
        ${order.delivery_notes ? `
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-label">Courier &amp; Special Instructions</div>
            <!-- FIX-4: Escaped delivery notes to prevent Stored XSS -->
            <div class="delivery-notes-box">${escapeHtml(order.delivery_notes)}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2rem; padding-top:1rem; border-top:1px solid var(--color-border);">
      <a href="orders.html" class="btn btn-outline">&larr; Back to Orders</a>
      <span style="font-size:0.85rem; color:var(--color-text-muted);">ShopNaija Educational Demo</span>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
