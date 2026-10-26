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
  const isInAdminDir = window.location.pathname.includes('/admin');
  const basePath = isInAdminDir ? '../' : '';
  const adminPath = isInAdminDir ? 'index.html' : 'admin/';
  const logoutTarget = isInAdminDir ? '../login.html' : 'login.html';
  const loginPath = isInAdminDir ? '../login.html' : 'login.html';

  // Ensure any previous bottom nav element is removed from DOM
  document.getElementById('mobile-bottom-nav-bar')?.remove();

  if (authContainer) {
    if (user) {
      const emailStr = user.email || user.fullName || 'User';
      const initial = (emailStr[0] || 'U').toUpperCase();

      authContainer.innerHTML = `
        <div class="user-avatar-wrap" style="position: relative;">
          <button class="user-avatar-btn" id="user-avatar-btn" aria-label="User Account Menu" title="${escapeHtml(user.email)}">
            <span class="user-avatar-circle">${escapeHtml(initial)}</span>
          </button>
          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <div class="user-dropdown-userinfo">
              <div class="user-dropdown-name">${escapeHtml(user.fullName || user.email.split('@')[0])}</div>
              <div class="user-dropdown-email">${escapeHtml(user.email)}</div>
              <span class="user-role-tag">${escapeHtml(user.role)}</span>
            </div>
            <div class="user-dropdown-divider"></div>
            <a href="${basePath}orders.html" class="user-dropdown-link">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span>My Orders</span>
            </a>
            ${user.role === 'admin' ? `
              <a href="${adminPath}" class="user-dropdown-link">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Admin Portal</span>
              </a>
            ` : ''}
            <div class="user-dropdown-divider"></div>
            <button id="logout-btn" class="user-dropdown-logout-btn">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span>Log out</span>
            </button>
          </div>
        </div>
      `;

      const avatarBtn = document.getElementById('user-avatar-btn');
      const dropdown = document.getElementById('user-dropdown-menu');

      avatarBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target) && e.target !== avatarBtn) {
          dropdown.classList.remove('open');
        }
      });

      document.getElementById('logout-btn')?.addEventListener('click', async () => {
        localStorage.removeItem('SHOPNAIJA_DEMO_SESSION');
        if (isSupabaseConfigured()) {
          const supabase = getSupabase();
          await supabase?.auth.signOut();
        }
        window.location.href = logoutTarget;
      });
    } else {
      authContainer.innerHTML = `
        <a href="${loginPath}" class="btn btn-primary btn-sm">Log In</a>
      `;
    }
  }
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
