# Private Downloads

Put the paid template ZIP files in this folder:

- `sandorm-template.zip`
- `octopus-in-a-jar-template.zip`

Express serves these files only through `/api/download/:templateId` after Stripe confirms the
Checkout Session was paid. Do not move these files to `public/` or `src/assets/`.
