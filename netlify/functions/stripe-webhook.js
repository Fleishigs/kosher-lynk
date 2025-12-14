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

      // Only decrease stock if tracking inventory
      if (product.track_inventory !== false) {
        const newStock = Math.max(0, product.stock - 1);

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);

        if (updateError) throw updateError;
        
        console.log(`Product ${productId}: Stock decreased to ${newStock}`);
      } else {
        console.log(`Product ${productId}: Unlimited stock (track_inventory disabled)`);
      }

      // Get detailed shipping information
      const shippingDetails = session.shipping_details || session.shipping || {};
      const customerDetails = session.customer_details || {};
      
      // Build complete shipping address
      const shippingAddress = shippingDetails.address || {};
      const fullShippingInfo = {
        name: shippingDetails.name || customerDetails.name || 'N/A',
        line1: shippingAddress.line1 || '',
        line2: shippingAddress.line2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        postal_code: shippingAddress.postal_code || '',
        country: shippingAddress.country || '',
      };
      
      // Save complete order to database
      try {
        const orderData = {
          product_id: parseInt(productId),
          product_name: product.name,
          product_price: product.price,
          product_image: product.images && product.images.length > 0 ? product.images[0] : product.image_url,
          quantity: 1,
          total_price: session.amount_total / 100,
          
          // Customer Contact Info
          customer_email: customerDetails.email || session.customer_email || 'unknown@email.com',
          customer_name: customerDetails.name || shippingDetails.name || 'Guest',
          customer_phone: customerDetails.phone || session.customer_details?.phone || 'N/A',
          
          // Complete Shipping Address
          shipping_address: fullShippingInfo,
          shipping_name: shippingDetails.name || customerDetails.name || 'N/A',
          
          // Payment Info
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          stripe_customer_id: session.customer,
          
          status: 'completed',
          
          // Metadata for future reference
          metadata: {
            checkout_session_url: session.url,
            payment_status: session.payment_status,
            amount_subtotal: session.amount_subtotal / 100,
            amount_total: session.amount_total / 100,
            currency: session.currency,
          }
        };

        const { error: orderError } = await supabase.from('orders').insert([orderData]);
        
        if (orderError) {
          console.error('Error saving order:', orderError);
        } else {
          console.log(`Order saved successfully for product ${productId}`);
          console.log(`Shipping to: ${fullShippingInfo.name}, ${fullShippingInfo.line1}, ${fullShippingInfo.city}`);
        }
      } catch (orderError) {
        console.error('Error saving order:', orderError.message);
      }
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
