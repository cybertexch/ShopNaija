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
      // Endpoint returned an error (e.g. 401 or 403 in the FIXED version)
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="state-box">
            <div class="alert alert-danger" style="display:block; max-width:600px; margin:0 auto;">
              <strong>🛡️ Access Denied (${response.status})</strong>
              <p style="margin-top:4px;">${escapeHtml(data.error || 'You do not have administrative permissions to view all orders.')}</p>
            </div>
            <p style="margin-top:1rem; font-size:0.9rem; color:var(--color-text-muted);">
              <em>In the FIXED version:</em> The serverless endpoint verified your JWT and role. Only users with role = 'admin' are permitted.
            </p>
          </td>
        </tr>
      `;
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="vuln-callout" style="border-left-color: var(--color-primary); background: #ecfdf5; border-color: #a7f3d0;">
            <strong style="color: #065f46;">✅ FIX-3 ACTIVE: Endpoint is securely guarded!</strong>
            <p style="color: #064e3b; margin-top:2px;">
              The server rejected unauthorized access with HTTP ${response.status}.
            </p>
          </div>
        `;
      }
      return;
    }

    // If response.ok was true:
    const orders = data.orders || [];
    if (countBadge) countBadge.textContent = `${orders.length} Orders`;

    // Check if the current user is NOT an admin but still received the orders (VULN-3!)
    const isVulnExposed = !user || user.role !== 'admin';

    if (statusContainer) {
      if (isVulnExposed) {
        statusContainer.innerHTML = `
          <div class="vuln-callout" style="border-left-color: var(--color-danger); background: #fff1f2; border-color: #fecdd3;">
            <strong style="color: #9f1239;">🚨 VULN-3 UNPROTECTED ADMIN ENDPOINT DETECTED!</strong>
            <p style="color: #4c0519; margin-top: 4px;">
              The backend returned <strong>${orders.length} customer orders</strong> without validating that the requester has administrative privileges! 
              ${!user ? 'You are not even logged in.' : `You are logged in as a normal customer (<strong>${escapeHtml(user.fullName)}</strong>).`}
            </p>
          </div>
        `;
      } else {
        statusContainer.innerHTML = `
          <div class="vuln-callout" style="border-left-color: var(--color-primary); background: #ecfdf5; border-color: #a7f3d0;">
            <strong style="color: #065f46;">Admin Access Granted</strong>
            <p style="color: #064e3b; margin-top: 2px;">
              Authenticated as Administrator (${escapeHtml(user.fullName)}).
            </p>
          </div>
        `;
      }
    }

    renderAdminOrders(orders, tbody);
  } catch (err) {
    console.error('Admin API fetch failed:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="state-box">
          <p class="alert alert-danger" style="display:block;">Could not connect to /api/admin/orders: ${escapeHtml(err.message)}</p>
          <p style="font-size:0.85rem; color:var(--color-text-muted); margin-top:0.5rem;">
            Make sure your Vercel local dev server (<code>vercel dev</code>) is running if testing serverless functions locally.
          </p>
        </td>
      </tr>
    `;
  }
}

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
    const dateFormatted = new Date(order.created_at).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td><code>${order.id.substring(0, 8)}...</code></td>
        <td><strong>${escapeHtml(customerName)}</strong></td>
        <td>${escapeHtml(order.delivery_phone)}</td>
        <td style="max-width:200px; font-size:0.85rem;" title="${escapeHtml(order.delivery_address)}">
          ${escapeHtml(order.delivery_address)}
        </td>
        <td>${escapeHtml(productName)} (×${order.quantity})</td>
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
