const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        .select('*')
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

      // Save order to database (only if orders table exists)
      try {
        const customerDetails = session.customer_details || {};
        const shippingAddress = customerDetails.address || {};
        
        const orderData = {
          product_id: parseInt(productId),
          product_name: product.name,
          product_price: product.price,
          product_image: product.images && product.images.length > 0 ? product.images[0] : product.image_url,
          quantity: 1,
          total_price: session.amount_total / 100,
          customer_email: customerDetails.email || session.customer_email || 'unknown@email.com',
          customer_name: customerDetails.name || 'Guest',
          shipping_address: shippingAddress,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          status: 'completed'
        };

        await supabase.from('orders').insert([orderData]);
      } catch (orderError) {
        console.error('Error saving order (table may not exist yet):', orderError);
        // Don't fail webhook if orders table doesn't exist
      }

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
