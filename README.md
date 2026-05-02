# Premium Codex Pets

A tiny Stripe-powered template shop for three hardcoded Codex pet downloads:

- Sandworm Larva
- Noir Detective Goldfish
- Oracle Octopus Jar

Each template has its own one-time Stripe Checkout price.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Stripe Setup

Set these environment variables:

- `STRIPE_SECRET_KEY`
- `SANDORM_PRICE_ID`
- `GOLDFISH_PRICE_ID`
- `OCTOPUS_JAR_PRICE_ID`
- `CLIENT_URL`, using the public app URL in production

## Protected Downloads

The paid ZIPs must live in `private-downloads/`, not in `public/` or `src/assets/`:

- `private-downloads/sandorm-template.zip`
- `private-downloads/goldfish-template.zip`
- `private-downloads/octopus-in-a-jar-template.zip`

The server checks Stripe for a paid Checkout Session before streaming a file from
`/api/download/:templateId`.

If the ZIPs are committed for Render deployment, keep the GitHub repo private. Otherwise anyone can
download the ZIPs directly from GitHub.

## Render Settings

```text
Build command: npm install && npm run build
Start command: npm start
```
