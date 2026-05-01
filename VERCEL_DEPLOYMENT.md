# Deploying RKDF Gym to Vercel

This guide will help you deploy the RKDF Gym application to Vercel.

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Push your code to GitHub (recommended for automatic deployments)
3. **Bun Runtime** - Vercel supports Bun; ensure `bun` is used in scripts
4. **Environment Variables** - Prepare the following secrets:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended for Testing)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel
```

### Option 2: Deploy via GitHub Integration (Recommended for Production)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/luxe_fitness.git
   git push -u origin main
   ```

2. **Connect in Vercel Dashboard**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select "Import Git Repository"
   - Choose your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In the Vercel dashboard, go to **Settings → Environment Variables**
   - Add all required environment variables (see Prerequisites)
   - Make sure service role key is marked as "Secret"

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy

## Environment Variables Setup

The `vercel.json` file already defines required environment variables. You need to set them in the Vercel dashboard:

| Variable | Type | Description |
|----------|------|-------------|
| `SUPABASE_URL` | Public | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Public | Supabase anonymous/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Secret | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Public | Stripe publishable API key |

## Configuration Files

- **`vercel.json`** - Deployment configuration with build commands and environment variables
- **`.vercelignore`** - Files/folders to exclude from deployment
- **`vite.config.ts`** - Vite configuration (uses Node.js adapter for Vercel)

## Build & Runtime Details

- **Framework**: TanStack Start (React full-stack)
- **Build Command**: `bun install && bun run build`
- **Node Version**: 22.x (specified in vercel.json)
- **Package Manager**: Bun
- **Output**: Automatically handled by TanStack Start for Node.js runtime

## Troubleshooting

### Build Fails: "Module not found"
- Ensure all dependencies in `package.json` are correctly listed
- Check that `.vercelignore` is not excluding necessary files
- Run `bun install` locally to verify dependencies

### Server Functions Not Working
- Verify environment variables are set in Vercel dashboard
- Check that `.server.ts` files are in `src/integrations/` (not excluded)
- Ensure Supabase and Stripe keys are correctly configured

### TypeScript Errors
- The build includes `tsconfig.json` which should handle type checking
- If errors persist, check that type definitions for dependencies are installed

### Environment Variables Not Loading
- In Vercel dashboard, go to **Settings → Environment Variables**
- Verify variables are set for the correct environment (Production, Preview, Development)
- Restart deployment after adding new variables

## Post-Deployment

1. **Test the Application**
   - Visit your deployed URL
   - Test authentication flow
   - Verify payment integration works

2. **Monitor Performance**
   - Use Vercel Analytics to monitor performance
   - Check Vercel Logs for any errors
   - Set up error tracking (e.g., Sentry)

3. **Set Up Custom Domain**
   - In Vercel dashboard, go to **Settings → Domains**
   - Add your custom domain
   - Following DNS configuration instructions

## Preview Deployments

Every push to your GitHub repository (except main) will create a preview deployment. This allows you to test changes before merging to production.

- Preview URLs are automatically generated
- Share preview URLs with your team for testing
- Merge to main to deploy to production

## Automatic Deployments

Once connected to GitHub, every commit to your main branch will automatically:
1. Build the application
2. Run build checks
3. Deploy to production (if builds succeed)

## Need Help?

- **Vercel Documentation**: https://vercel.com/docs
- **TanStack Start**: https://tanstack.com/start
- **Supabase Deployment**: https://supabase.com/docs/guides/hosting/overview
- **Stripe Integration**: https://stripe.com/docs

## Security Notes

- Never commit `.env` or environment variable files
- Always mark secrets (service keys, API keys) as "Secret" in Vercel
- Use Vercel's built-in secrets for sensitive data
- Regularly rotate API keys
- Monitor access logs for suspicious activity
