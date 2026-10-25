// api/admin/orders.js
// Vercel Serverless Function: Admin Orders Endpoint
// VULNERABLE VERSION: Contains intentional security flaw VULN-3 for educational demo

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers so it can be tested from frontend or curl
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

  // ============================================================================
  // // VULN-3: UNPROTECTED ADMIN ENDPOINT
  // Flaw: This endpoint does NOT verify the caller's identity or role.
  // Anyone on the internet can send a GET request to /api/admin/orders and
  // receive the full list of all customer orders, delivery addresses, and phone numbers!
  // ============================================================================

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Uses service role key (or anon key with bypass) to query all records
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing Supabase environment variables on server',
        tip: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel project settings.'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all orders joined with product details and user profile
    const { data: orders, error } = await supabase
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
