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

  renderOrdersTable(orders, container);
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
  } else {
    // Instant fallback demo mock (0ms)
    order = FALLBACK_ORDERS.find(o => o.id === orderId) || FALLBACK_ORDERS[0];
  }

  if (fetchError || !order) {
    card.innerHTML = `
      <div class="state-box">
        <div class="alert alert-danger" style="display:block;">
          <strong>Access Denied or Order Not Found</strong>
          <p style="margin-top:4px;">${fetchError ? escapeHtml(fetchError.message) : 'Order could not be loaded.'}</p>
        </div>
        <p style="margin-top:1rem; font-size:0.9rem; color:var(--color-text-muted);">
          <em>If you are testing the FIXED version:</em> This is the expected defensive behavior! You cannot view another customer's order.
        </p>
        <a href="orders.html" class="btn btn-primary" style="margin-top:1.5rem;">Return to My Orders</a>
      </div>
    `;
    return;
  }

  renderOrderDetail(order, user, card);
}

function renderOrderDetail(order, currentUser, container) {
  const isOwner = currentUser.id === order.user_id;
  const isIdorExposed = !isOwner && currentUser.role !== 'admin';
  const productName = order.products?.name || 'Nigerian Heritage Product';
  const productPrice = order.products?.price || order.total;
  const productImage = order.products?.image_url || 'images/products/aso-oke.svg';
  const formattedDate = new Date(order.created_at).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  container.innerHTML = `
    ${isIdorExposed ? `
      <div class="vuln-callout" style="border-left-color: var(--color-danger); background: #fff1f2; border-color: #fecdd3;">
        <strong style="color: #9f1239;">🚨 VULN-1 IDOR ACTIVE: You are viewing another customer's order!</strong>
        <p style="color: #4c0519; margin-top: 4px;">
          You are currently authenticated as <strong>${escapeHtml(currentUser.fullName)}</strong> (UUID: <code>${currentUser.id.substring(0, 8)}...</code>), 
          yet you are viewing private personal delivery information belonging to customer ID <code>${order.user_id.substring(0, 8)}...</code>!
        </p>
      </div>
    ` : ''}

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

    <!-- Product Item -->
    <div class="detail-section">
      <div class="detail-section-title">Purchased Items</div>
      <div style="display:flex; align-items:center; gap:1rem; padding:1rem; background:var(--color-surface-alt); border-radius:var(--radius-md);">
        <img src="${escapeHtml(productImage)}" alt="${escapeHtml(productName)}" style="width:70px; height:70px; object-fit:cover; border-radius:var(--radius-sm);" />
        <div style="flex:1;">
          <h4 style="font-size:1.05rem; font-weight:700;">${escapeHtml(productName)}</h4>
          <p style="color:var(--color-text-muted); font-size:0.9rem;">Qty: ${order.quantity} × ₦${Number(productPrice).toLocaleString()}</p>
        </div>
        <div style="font-size:1.2rem; font-weight:800; color:var(--color-primary);">
          ₦${Number(order.total).toLocaleString()}
        </div>
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
