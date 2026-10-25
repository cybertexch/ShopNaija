// public/js/auth.js
// Authentication management & Header State for ShopNaija Demo

import { getSupabase } from './supabaseClient.js';

export async function getCurrentUser() {
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
  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <div class="user-badge" title="Logged in as ${user.email}">
        <span>${escapeHtml(user.fullName)}</span>
        <span class="user-role-tag">${user.role}</span>
      </div>
      <button id="logout-btn" class="btn btn-outline btn-sm">Log out</button>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-primary btn-sm">Log In / Sign Up</a>
    `;
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
  const supabase = getSupabase();
  return await supabase.auth.signInWithPassword({ email, password });
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
