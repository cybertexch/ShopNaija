// public/js/supabaseClient.js
// Supabase Client Initialization and Configuration for ShopNaija Demo

// Default demo fallback config (Can be overridden via localStorage or window.ENV)
// In production/deployment, replace these placeholders with your actual Supabase project credentials.
const DEFAULT_SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('SHOPNAIJA_SUPABASE_URL') || 'https://demo-shopnaija-project.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('SHOPNAIJA_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-anon-key-placeholder';

// ============================================================================
// // FIX-2: REMOVE EXPOSED SECRET FROM FRONTEND
// Remediated: The private API key (sk_demo_not_real_123) has been removed from
// client-side code and moved to Vercel environment variables (process.env.DEMO_THIRD_PARTY_KEY).
// Frontend code only contains the public Supabase anon key.
// ============================================================================


// Initialize Supabase Client via CDN library (window.supabase)
let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase CDN library not loaded yet');
      return null;
    }
    const url = localStorage.getItem('SHOPNAIJA_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
    const anonKey = localStorage.getItem('SHOPNAIJA_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
    supabaseClient = window.supabase.createClient(url, anonKey);
  }
  return supabaseClient;
}

export function updateSupabaseConfig(url, key) {
  localStorage.setItem('SHOPNAIJA_SUPABASE_URL', url);
  localStorage.setItem('SHOPNAIJA_SUPABASE_ANON_KEY', key);
  if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(url, key);
  }
}
