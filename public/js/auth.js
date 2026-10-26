// public/js/auth.js
// Authentication management & Header State for ShopNaija Demo

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';

export async function getCurrentUser() {
  // Check local demo session first (instant 0ms resolution)
  const localSession = localStorage.getItem('SHOPNAIJA_DEMO_SESSION');
  if (localSession) {
    try {
      return JSON.parse(localSession);
    } catch (_) {}
  }

  // If Supabase credentials are not configured yet, do not hang on network timeouts
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Fetch user profile from public.profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: profile ? profile.full_name : session.user.email.split('@')[0],
      role: profile ? profile.role : 'customer',
      token: session.access_token
    };
  } catch (err) {
    console.warn('Session check warning:', err);
    return null;
  }
}

export async function initHeaderAuth() {
  const user = await getCurrentUser();
  const authContainer = document.getElementById('nav-auth-container');
  if (authContainer) {
    if (user) {
      const isInAdminDir = window.location.pathname.includes('/admin');
      const adminPath = isInAdminDir ? 'index.html' : 'admin/';
      const logoutTarget = isInAdminDir ? '../login.html' : 'login.html';

      authContainer.innerHTML = `
        <div class="user-badge" title="Logged in as ${user.email}">
          <span>${escapeHtml(user.fullName)}</span>
          <span class="user-role-tag">${user.role}</span>
        </div>
        ${user.role === 'admin' ? `
          <a href="${adminPath}" class="btn btn-primary btn-sm" style="background:#0f172a; border-color:#0f172a; color:#fff;">Admin Portal</a>
        ` : ''}
        <button id="logout-btn" class="btn btn-outline btn-sm">Log out</button>
      `;
      document.getElementById('logout-btn')?.addEventListener('click', async () => {
        localStorage.removeItem('SHOPNAIJA_DEMO_SESSION');
        if (isSupabaseConfigured()) {
          const supabase = getSupabase();
          await supabase?.auth.signOut();
        }
        window.location.href = logoutTarget;
      });
    } else {
      const isInAdminDir = window.location.pathname.includes('/admin');
      const loginPath = isInAdminDir ? '../login.html' : 'login.html';
      authContainer.innerHTML = `
        <a href="${loginPath}" class="btn btn-primary btn-sm">Log In</a>
      `;
    }
  }

  // Mount mobile bottom navigation bar
  renderMobileBottomNav(user);
}

function renderMobileBottomNav(user) {
  if (document.getElementById('mobile-bottom-nav-bar')) return;

  const currentPath = window.location.pathname.toLowerCase();
  const isInAdminDir = currentPath.includes('/admin');
  const basePath = isInAdminDir ? '../' : '';

  const isProducts = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '';
  const isOrders = currentPath.includes('orders.html') || currentPath.includes('order.html');
  const isAdmin = isInAdminDir || currentPath.includes('admin.html');
  const isLogin = currentPath.includes('login.html');

  const nav = document.createElement('nav');
  nav.id = 'mobile-bottom-nav-bar';
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
  nav.innerHTML = `
    <a href="${basePath}index.html" class="mobile-nav-item ${isProducts && !isInAdminDir ? 'active' : ''}">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
      <span>Products</span>
    </a>
    <a href="${basePath}orders.html" class="mobile-nav-item ${isOrders ? 'active' : ''}">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
      <span>Orders</span>
    </a>
    ${user && user.role === 'admin' ? `
      <a href="${basePath}admin/" class="mobile-nav-item ${isAdmin ? 'active' : ''}">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        <span>Admin</span>
      </a>
    ` : ''}
    <a href="${basePath}login.html" class="mobile-nav-item ${isLogin ? 'active' : ''}">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      <span>${user ? 'Account' : 'Log In'}</span>
    </a>
  `;
  document.body.appendChild(nav);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  return user;
}

export async function login(email, password) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    return await supabase.auth.signInWithPassword({ email, password });
  }

  // Pre-configured demo user accounts for instant rehearsals without backend latency
  const DEMO_USERS = {
    'admin@shopnaija.demo': { id: 'a0000000-0000-0000-0000-000000000001', fullName: 'Captain Admin (Demo)', role: 'admin' },
    'chidi@shopnaija.demo': { id: 'c0000000-0000-0000-0000-000000000001', fullName: 'Chidi Okafor (Fake)', role: 'customer' },
    'amina@shopnaija.demo': { id: 'c0000000-0000-0000-0000-000000000002', fullName: 'Amina Bello (Fake)', role: 'customer' }
  };

  const userMeta = DEMO_USERS[email.toLowerCase()] || {
    id: 'c0000000-0000-0000-0000-000000000001',
    fullName: email.split('@')[0],
    role: email.toLowerCase().includes('admin') ? 'admin' : 'customer'
  };

  const sessionObj = {
    id: userMeta.id,
    email: email,
    fullName: userMeta.fullName,
    role: userMeta.role,
    token: 'demo-local-jwt-token'
  };

  localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(sessionObj));
  return { data: { user: sessionObj }, error: null };
}

export async function signup(email, password, fullName) {
  const supabase = getSupabase();
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer'
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
