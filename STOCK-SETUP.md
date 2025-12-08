# Stock Management Setup

Your site now automatically decreases stock when someone purchases!

## How It Works:
1. Customer clicks "Purchase Now"
2. Stripe processes payment
3. Stripe sends webhook to your site
4. Your site decreases product stock by 1
5. If stock hits 0, product shows "Out of Stock"

## Setup Instructions:

### 1. Deploy Your Site First
Push all files to GitHub and deploy on Netlify.

### 2. Get Webhook Secret from Stripe
1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
4. Select events to listen to: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### 3. Add to Netlify Environment Variables
Go to Netlify Dashboard → Your Site → Site Configuration → Environment Variables

Add this new variable:
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_...` (the signing secret from Stripe)

### 4. Redeploy
After adding the environment variable, trigger a new deploy.

## Testing:
1. Make a test purchase with Stripe test card: `4242 4242 4242 4242`
2. Check admin dashboard - stock should decrease by 1
3. When stock reaches 0, product shows "Out of Stock" on frontend

## Environment Variables Needed:
- `STRIPE_SECRET_KEY` ✓ (already added)
- `STRIPE_WEBHOOK_SECRET` (add this one)

That's it! Stock will now update automatically.
