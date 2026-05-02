# Nothing SaaS Stripe Test App

A tiny local SaaS shell that does nothing except prove a Stripe Checkout one-time payment flow works.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Stripe Test Setup

1. In Stripe, switch to test mode.
2. Create a product named `Nothing Pass`.
3. Create a one-time price, for example `EUR 5`.
4. Copy the test secret key into `STRIPE_SECRET_KEY` in `.env`.
5. Copy the one-time price ID into `STRIPE_PRICE_ID` in `.env`.
6. Restart `npm run dev`.

Use Stripe's test card:

```text
4242 4242 4242 4242
Any future expiry
Any 3 digit CVC
Any postal code
```

## Deploy Notes

For Render or another host, deploy the Express server and Vite build together or split them into a frontend and backend. Set:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `CLIENT_URL`, using the public app URL

Render settings:

```text
Build command: npm install && npm run build
Start command: npm start
```

This demo does not persist payment state yet. The next production step is a webhook handler plus a database.
