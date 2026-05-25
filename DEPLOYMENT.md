# Deployment Guide

This project is ready for Vercel deployment as a Next.js application. All sensitive values must live in environment variables; do not commit real API keys, database URLs, service account JSON, or `.env` files.

## Recommended Free Deployment

Use:

- **Vercel** for the Next.js frontend and API routes.
- **Demo memory mode** first, with no database required.
- **Neon or Supabase Postgres** later if you want persistent evidence storage.

The safest free-tier defaults are included in [.env.vercel.example](.env.vercel.example).

## Vercel Steps

1. Push the repository to GitHub.
2. In Vercel, choose **Add New -> Project**.
3. Import the GitHub repository.
4. Vercel should detect **Next.js** automatically.
5. Keep these project settings:

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: default
```

The repository also includes [vercel.json](vercel.json), which pins the install and build commands.

## Environment Variables

In Vercel, go to:

```text
Project -> Settings -> Environment Variables
```

For a safe free demo deployment, add:

```env
NEXT_PUBLIC_APP_NAME=NALCO Intelligence Bot
APP_BASE_URL=https://your-project.vercel.app
ENABLE_LIVE_INGEST=false
ENABLE_PAGE_LOAD_INGEST=false
GDELT_ENABLED=false
NALCO_MOCK_LIVE_SOURCES=true
```

Optional database persistence:

```env
DATABASE_URL=your_neon_or_supabase_pooled_postgres_url
```

Optional LLM formatting:

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
OLLAMA_API_KEY=
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gemma4:31b-cloud
```

Optional integrations:

```env
NEWS_API_KEY=
COMMODITY_API_KEY=
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
SCRAPER_USER_AGENT=NALCO-Intelligence-Bot/1.0 (+public-demo)
INGEST_TIMEOUT_MS=12000
NALCO_CRAWL_CONCURRENCY=4
NALCO_CRAWL_MAX_PAGES=160
INGESTION_INTERVAL_MINUTES=5
```

## Credential Handling

Local secrets belong in `.env`. Production secrets belong in Vercel environment variables.

These files are intentionally ignored:

- `.env`
- `.env.local`
- `.env.production`
- `.vercel/`

These safe templates are committed:

- [.env.example](.env.example)
- [.env.vercel.example](.env.vercel.example)

For Google Sheets, base64-encode the service account JSON and store it in:

```env
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
```

Never commit the raw service account JSON file.

## Prisma and Database

The build command runs:

```bash
node scripts/prisma-generate.mjs && next build
```

The Prisma helper sets a harmless placeholder `DATABASE_URL` only for client generation when no real database URL is configured. Runtime database access still happens only when a real `DATABASE_URL` exists.

For a production database:

1. Create a Neon or Supabase Postgres database.
2. Add the pooled connection string as `DATABASE_URL` in Vercel.
3. Run migrations from your local machine:

```bash
DATABASE_URL="your_postgres_url" npx prisma migrate deploy
```

4. Optionally seed:

```bash
DATABASE_URL="your_postgres_url" npm run prisma:seed
```

If `DATABASE_URL` is empty, the app uses demo memory data.

## Ingestion on Vercel

For the first free deployment, keep live ingestion disabled:

```env
ENABLE_LIVE_INGEST=false
ENABLE_PAGE_LOAD_INGEST=false
GDELT_ENABLED=false
NALCO_MOCK_LIVE_SOURCES=true
```

This avoids unnecessary crawling, external API calls, and serverless timeouts.

When you are ready for live ingestion:

```env
ENABLE_LIVE_INGEST=true
ENABLE_PAGE_LOAD_INGEST=false
GDELT_ENABLED=true
NALCO_MOCK_LIVE_SOURCES=false
```

Then trigger ingestion manually with:

```text
POST https://your-project.vercel.app/api/ingest/run
```

If you add Vercel Cron later, create a small authenticated route or scheduled function that calls the ingestion endpoint carefully. Avoid one-minute cron intervals on free tiers unless you have confirmed your limits.

## Deployment Checklist

Before deploying:

```bash
npm run typecheck
npm run lint
npm run build
```

After deploying, test:

```text
/
/dashboard
/search?q=latest%20NALCO%20announcements
/sources
/entities
/api/health
```

Expected health response:

```json
{
  "status": "ok",
  "app": "NALCO Intelligence Bot"
}
```

## Commodity Data

The included commodity adapter provides transparent fallback market context. It does not claim live aluminium prices unless a real commodity provider is configured.

Set `COMMODITY_API_KEY` only after you integrate a licensed commodity data provider.
