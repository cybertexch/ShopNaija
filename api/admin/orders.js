// api/admin/orders.js
// Vercel Serverless Function: Admin Orders Endpoint
// FIXED VERSION: Protected with Supabase JWT validation & role-based access control (FIX-3)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        error: 'Missing Supabase environment variables on server',
        tip: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel project settings.'
      });
    }

    // ============================================================================
    // // FIX-3: SERVER-SIDE AUTHENTICATION & ROLE-BASED ACCESS CONTROL
    // 1. Extract Bearer token from Authorization header
    // 2. Cryptographically verify the JWT using Supabase Auth
    // 3. Confirm the user's role is strictly 'admin' in public.profiles
    // ============================================================================
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Authorization header. A valid Bearer token is required.'
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 2: Validate JWT against Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        error: 'Unauthorized: Session expired or invalid token.'
      });
    }

    // Step 3: Verify the user holds the 'admin' role in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions. User does not possess the administrator role.'
      });
    }

    // Authenticated & Authorized: Fetch all customer orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        quantity,
        total,
        delivery_name,
        delivery_address,
        delivery_phone,
        status,
        created_at,
        profiles (
          id,
          full_name,
          role
        ),
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    return res.status(200).json({
      success: true,
      admin: profile.full_name,
      count: orders.length,
      orders: orders
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
