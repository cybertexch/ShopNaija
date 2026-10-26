// public/js/supabaseClient.js
// Supabase Client Initialization and Configuration for ShopNaija Demo

// Default demo fallback config (Can be overridden via localStorage or window.ENV)
// In production/deployment, replace these placeholders with your actual Supabase project credentials.
const DEFAULT_SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('SHOPNAIJA_SUPABASE_URL') || 'https://yngbrzhostqrtltblouy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('SHOPNAIJA_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZ2Jyemhvc3RxcnRsdGJsb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTczOTUsImV4cCI6MjEwODQ5MzM5NX0.E_MDtOe7L_Yv16D9lKzcAN5Pkbq1KRISR3WtdeRHPFE';

// ============================================================================
// // VULN-2: EXPOSED SECRET IN FRONTEND CODE
// Flaw: A secret third-party API key is hardcoded directly into client-side JS.
// Anyone can view this key in browser DevTools (Sources / Network / Console).
// NOTE: This is a FAKE demo key for defensive training only. Never use real keys.
// ============================================================================
const DEMO_THIRD_PARTY_KEY = 'sk_demo_not_real_123'; // VULN-2: Exposed secret key in frontend bundle!

// Log to console on init so speakers can demonstrate finding it in DevTools Console or Sources
console.warn(
  '%c[ShopNaija Security Demo - VULN-2]%c Secret key exposed in client:',
  'background: #ea580c; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  'color: #ea580c; font-weight: bold;',
  DEMO_THIRD_PARTY_KEY
);

// Initialize Supabase Client via CDN library (window.supabase)
let supabaseClient = null;

export function isSupabaseConfigured() {
  const url = localStorage.getItem('SHOPNAIJA_SUPABASE_URL') || window.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('SHOPNAIJA_SUPABASE_ANON_KEY') || window.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return Boolean(
    url && 
    key && 
    !url.includes('demo-shopnaija-project') && 
    !url.includes('your-project') &&
    url.startsWith('https://')
  );
}

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

export function getDemoThirdPartyKey() {
  return DEMO_THIRD_PARTY_KEY; // VULN-2
}

export function updateSupabaseConfig(url, key) {
  localStorage.setItem('SHOPNAIJA_SUPABASE_URL', url);
  localStorage.setItem('SHOPNAIJA_SUPABASE_ANON_KEY', key);
  if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(url, key);
  }
}
