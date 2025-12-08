const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xfswosnhewblxdtvtbcz.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3dvc25oZXdibHhkdHZ0YmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDg5NjEsImV4cCI6MjA4MDcyNDk2MX0.xghqZwlpxQ6Gu0nz98wVUOOtz-Hqiw5NPNJ0mAE9TLc'
);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle successful checkout
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    // Get product ID from metadata
    const productId = session.metadata?.productId;
    
    if (!productId) {
      console.error('No product ID in session metadata');
      return { statusCode: 400, body: 'No product ID' };
    }

    try {
      // Get current product
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      // Decrease stock by 1
      const newStock = Math.max(0, product.stock - 1);

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (updateError) throw updateError;

      console.log(`Updated product ${productId} stock to ${newStock}`);
    } catch (error) {
      console.error('Error updating stock:', error);
      return { statusCode: 500, body: 'Error updating stock' };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
