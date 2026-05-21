# Recursive Score

This is a web application for creating and playback of musical scores. Built with React, TypeScript, Vite, and Tone.js.

## Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

## Vercel Deployment Instructions

This project is fully ready to be deployed to Vercel.

1. Push your code to a GitHub repository.
2. In the Vercel dashboard, click **Add New... > Project**.
3. Import your GitHub repository.
4. Use the following build settings (Vercel should automatically detect most of these):

   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install` (default)

5. Click **Deploy**.

## Custom Domain Setup

To host this project at `recursive.oranocmg.com`:

1. Once the project is deployed, go to the project's **Settings** in Vercel.
2. Navigate to **Domains**.
3. Add `recursive.oranocmg.com`.
4. Vercel will ask you to configure your DNS settings. Add the following record to the domain `oranocmg.com` via your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

   - **Type**: `CNAME`
   - **Name** (or Host): `recursive`
   - **Value** (or Points to): `cname.vercel-dns.com.`

*(Note: Depending on your DNS provider, it might take some time for the records to propagate.)*
# recursive
