const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { productId, productName, productPrice, productImage } = JSON.parse(event.body);

    // Build product_data - only include images if they exist
    const productData = {
      name: productName
    };
    
    // Only add images array if productImage exists and is not empty
    if (productImage && productImage.trim() !== '') {
      productData.images = [productImage];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: productData,
            unit_amount: Math.round(productPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://kosherlynk.netlify.app'}/success`,
      cancel_url: `${event.headers.origin || 'https://kosherlynk.netlify.app'}/products`,
      metadata: {
        productId: productId.toString()
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
