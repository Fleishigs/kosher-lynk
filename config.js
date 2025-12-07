// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://abc123.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Stripe Configuration
const STRIPE_PUBLIC_KEY = 'YOUR_STRIPE_PUBLISHABLE_KEY';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize Stripe
const stripe = typeof Stripe !== 'undefined' ? Stripe(STRIPE_PUBLIC_KEY) : null;
