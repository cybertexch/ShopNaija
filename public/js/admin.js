// public/js/admin.js
// Admin dashboard logic for ShopNaija Demo
// Calls /api/admin/orders to demonstrate VULN-3

import { getCurrentUser, initHeaderAuth } from './auth.js';

export async function initAdminPage() {
  await initHeaderAuth();
  const user = await getCurrentUser();
  const statusContainer = document.getElementById('admin-status-banner');
  const tbody = document.getElementById('admin-orders-tbody');
  const countBadge = document.getElementById('admin-orders-count');

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="state-box">
        <div class="state-spinner"></div>
        <p>Calling /api/admin/orders...</p>
      </td>
    </tr>
  `;

  try {
    // Send request to /api/admin/orders.
    // If user is logged in, attach Authorization header (for testing fixed branch)
    const headers = {};
    if (user && user.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const response = await fetch('/api/admin/orders', {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();

    if (!response.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="state-box">
            <div class="alert alert-danger" style="display:block; max-width:600px; margin:0 auto;">
              <strong>Access Denied (${response.status})</strong>
              <p style="margin-top:4px;">${escapeHtml(data.error || 'Administrative permissions required to view orders.')}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Merge local orders from checkout
    const localOrdersRaw = localStorage.getItem('SHOPNAIJA_LOCAL_ORDERS');
    const localOrders = localOrdersRaw ? JSON.parse(localOrdersRaw) : [];
    const allOrders = [...localOrders, ...(data.orders || [])];

    if (countBadge) countBadge.textContent = `${allOrders.length} Orders`;
    renderAdminOrders(allOrders, tbody);
  } catch (err) {
    console.warn('Admin API fetch fallback:', err);
    
    // Provide clean presentation fallback with local orders merged
    const localOrdersRaw = localStorage.getItem('SHOPNAIJA_LOCAL_ORDERS');
    const localOrders = localOrdersRaw ? JSON.parse(localOrdersRaw) : [];
    const combinedOrders = [...localOrders, ...MOCK_ADMIN_ORDERS];

    if (countBadge) countBadge.textContent = `${combinedOrders.length} Orders`;
    renderAdminOrders(combinedOrders, tbody);
  }
}

const MOCK_ADMIN_ORDERS = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    delivery_name: 'Chidi Okafor (Customer)',
    delivery_phone: '+234 800 000 0001',
    delivery_address: '12 Marina Street, Lagos Island, Lagos',
    delivery_notes: 'Leave at security gate with Musa.',
    total: 45000,
    status: 'Processing',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    products: { name: 'Handwoven Aso-Oke Agbada Set' },
    profiles: { full_name: 'Chidi Okafor' }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    delivery_name: 'Amina Bello (IDOR Target)',
    delivery_phone: '+234 800 111 2222',
    delivery_address: 'Plot 404 Nowhere Close, Maitama, Abuja FCT',
    delivery_notes: 'Deliver strictly to VIP reception.',
    total: 24000,
    status: 'Shipped',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    products: { name: 'Beaded Coral Choker Necklace' },
    profiles: { full_name: 'Amina Bello' }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000008',
    delivery_name: 'Babajide Adeleke (Customer)',
    delivery_phone: '+234 800 222 3333',
    delivery_address: '5 Admiralty Way, Lekki Phase 1, Lagos',
    total: 32000,
    status: 'Delivered',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    products: { name: 'Handcrafted Kano Leather Slippers' },
    profiles: { full_name: 'Babajide Adeleke' }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000010',
    delivery_name: 'Fatima Danjuma (Customer)',
    delivery_phone: '+234 800 333 4444',
    delivery_address: '18 Bompai Road, Nassarawa, Kano',
    total: 18500,
    status: 'Processing',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    products: { name: 'Benin Bronze Replica Mask' },
    profiles: { full_name: 'Fatima Danjuma' }
  }
];

function renderAdminOrders(orders, container) {
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="state-box">
          <p>No orders recorded in the system.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const customerName = order.profiles?.full_name || order.delivery_name || 'Customer';
    const productName = order.products?.name || 'Product';

    return `
      <tr>
        <td><code>${order.id.substring(0, 8)}...</code></td>
        <td><strong>${escapeHtml(customerName)}</strong></td>
        <td>${escapeHtml(order.delivery_phone)}</td>
        <td style="max-width:220px; font-size:0.85rem;">
          <div>${escapeHtml(order.delivery_address)}</div>
            <!-- FIX-4: Escaped delivery notes to prevent Stored XSS -->
            <div class="delivery-notes-box">
              <span style="font-size:0.75rem; font-weight:700; color:var(--color-primary);">Note:</span>
              ${escapeHtml(order.delivery_notes)}
            </div>
          ` : ''}
        </td>
        <td>${escapeHtml(productName)}${order.quantity ? ` (×${order.quantity})` : ''}</td>
        <td>₦${Number(order.total).toLocaleString()}</td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

document.addEventListener('DOMContentLoaded', initAdminPage);
