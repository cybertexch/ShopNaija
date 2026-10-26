// public/js/auth.js
// Authentication management & Header State for ShopNaija Demo

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';

export async function getCurrentUser() {
  // Check local session first
  const localSession = localStorage.getItem('SHOPNAIJA_DEMO_SESSION');
  if (localSession) {
    try {
      return JSON.parse(localSession);
    } catch (_) {}
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    let fullName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    let role = session.user.user_metadata?.role || (session.user.email.toLowerCase().includes('admin') ? 'admin' : 'customer');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        fullName = profile.full_name || fullName;
        role = profile.role || role;
      }
    } catch (_) {}

    const userObj = {
      id: session.user.id,
      email: session.user.email,
      fullName,
      role,
      token: session.access_token
    };

    localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(userObj));
    return userObj;
  } catch (err) {
    console.warn('Session check warning:', err);
    return null;
  }
}

export async function initHeaderAuth() {
  const user = await getCurrentUser();
  const authContainer = document.getElementById('nav-auth-container');
  const cartBtn = document.getElementById('cart-trigger-btn');
  const navOrders = document.getElementById('nav-orders');
  const navOrdersLi = navOrders?.closest('li');

  const isInAdminDir = window.location.pathname.includes('/admin');
  const basePath = isInAdminDir ? '../' : '';
  const adminPath = isInAdminDir ? 'index.html' : 'admin/';
  const logoutTarget = isInAdminDir ? '../login.html' : 'login.html';
  const loginPath = isInAdminDir ? '../login.html' : 'login.html';

  // Ensure any previous bottom nav element is removed from DOM
  document.getElementById('mobile-bottom-nav-bar')?.remove();

  // Remove any Products links from navbar (homepage is the products page)
  document.querySelectorAll('.site-header .nav-links a').forEach(a => {
    const text = a.textContent.trim().toLowerCase();
    const href = a.getAttribute('href') || '';
    if (text === 'products' || href === 'index.html' || href === '../index.html') {
      a.closest('li')?.remove();
    }
  });

  if (user) {
    // Logged in: show Cart/Bag and My Orders
    if (cartBtn) cartBtn.style.display = 'inline-flex';
    if (navOrders) navOrders.style.display = 'inline-block';
    if (navOrdersLi) navOrdersLi.style.display = 'block';

    if (authContainer) {
      const emailStr = user.fullName || user.email || 'User';
      const initial = (emailStr.trim()[0] || 'U').toUpperCase();

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
    }
  } else {
    // Logged out: hide Cart/Bag and My Orders
    if (cartBtn) cartBtn.style.display = 'none';
    if (navOrders) navOrders.style.display = 'none';
    if (navOrdersLi) navOrdersLi.style.display = 'none';

    if (authContainer) {
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
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Try Supabase Authentication if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (!error && data?.session) {
          const userObj = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
            role: data.user.user_metadata?.role || (data.user.email.toLowerCase().includes('admin') ? 'admin' : 'customer'),
            token: data.session.access_token
          };
          localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(userObj));
          return { data: { user: userObj }, error: null };
        }
      }
    } catch (e) {
      console.warn('Supabase signIn exception:', e);
    }
  }

  // 2. Check local registration accounts created in this browser
  try {
    const rawAccounts = localStorage.getItem('SHOPNAIJA_ACCOUNTS');
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      const acc = accounts[normalizedEmail];
      if (acc) {
        if (acc.password === password) {
          localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(acc.user));
          return { data: { user: acc.user }, error: null };
        } else {
          return { data: null, error: new Error('Invalid login credentials') };
        }
      }
    }
  } catch (_) {}

  // 3. Fallback demo user accounts (works even if Supabase is offline or unseeded)
  const DEMO_USERS = {
    'admin@shopnaija.demo': { id: 'a0000000-0000-0000-0000-000000000001', fullName: 'Captain Admin (Demo)', role: 'admin' },
    'chidi@shopnaija.demo': { id: 'c0000000-0000-0000-0000-000000000001', fullName: 'Chidi Okafor (Fake)', role: 'customer' },
    'amina@shopnaija.demo': { id: 'c0000000-0000-0000-0000-000000000002', fullName: 'Amina Bello (Fake)', role: 'customer' }
  };

  const userMeta = DEMO_USERS[normalizedEmail] || {
    id: 'u' + Date.now().toString(16).padEnd(31, '0'),
    fullName: email.split('@')[0],
    role: normalizedEmail.includes('admin') ? 'admin' : 'customer'
  };

  const sessionObj = {
    id: userMeta.id,
    email: normalizedEmail,
    fullName: userMeta.fullName,
    role: userMeta.role,
    token: 'demo-local-jwt-token'
  };

  localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(sessionObj));
  return { data: { user: sessionObj }, error: null };
}

export async function signup(email, password, fullName) {
  const normalizedEmail = email.toLowerCase().trim();
  let supabaseUser = null;

  // 1. Attempt Supabase Auth Sign Up if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
              role: normalizedEmail.includes('admin') ? 'admin' : 'customer'
            }
          }
        });
        if (!error && data?.user) {
          supabaseUser = data.user;
          if (data.session) {
            const userObj = {
              id: data.user.id,
              email: data.user.email,
              fullName: fullName || email.split('@')[0],
              role: normalizedEmail.includes('admin') ? 'admin' : 'customer',
              token: data.session.access_token
            };
            localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(userObj));
            return { data: { user: userObj }, error: null };
          }
        }
      }
    } catch (e) {
      console.warn('Supabase signUp error (e.g. email rate limit):', e);
    }
  }

  // 2. Guaranteed Instant Account Creation (bypasses Supabase 429 email rate limits)
  const userId = supabaseUser?.id || ('u' + Date.now().toString(16).padEnd(31, '0'));
  const userObj = {
    id: userId,
    email: normalizedEmail,
    fullName: fullName || email.split('@')[0],
    role: normalizedEmail.includes('admin') ? 'admin' : 'customer',
    token: 'demo-local-jwt-token'
  };

  // Store in browser accounts list so login immediately succeeds
  try {
    const rawAccounts = localStorage.getItem('SHOPNAIJA_ACCOUNTS') || '{}';
    const accounts = JSON.parse(rawAccounts);
    accounts[normalizedEmail] = {
      password,
      user: userObj
    };
    localStorage.setItem('SHOPNAIJA_ACCOUNTS', JSON.stringify(accounts));
  } catch (_) {}

  // Save active session
  localStorage.setItem('SHOPNAIJA_DEMO_SESSION', JSON.stringify(userObj));

  // If Supabase is connected, attempt to insert into public.profiles
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      await supabase?.from('profiles').upsert({
        id: userObj.id,
        full_name: userObj.fullName,
        role: userObj.role
      });
    } catch (_) {}
  }

  return { data: { user: userObj }, error: null };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
