import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OLLAMA_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().default("https://ollama.com"),
  OLLAMA_MODEL: z.string().default("gemma4:31b-cloud"),
  GOOGLE_SHEETS_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  GDELT_ENABLED: z.coerce.boolean().default(false),
  COMMODITY_API_KEY: z.string().optional(),
  SCRAPER_USER_AGENT: z.string().optional(),
  INGEST_USER_AGENT: z.string().optional(),
  INGEST_TIMEOUT_MS: z.coerce.number().default(12000),
  NALCO_CRAWL_CONCURRENCY: z.coerce.number().default(4),
  NALCO_CRAWL_MAX_PAGES: z.coerce.number().default(160),
  INGESTION_INTERVAL_MINUTES: z.coerce.number().default(1),
  NEXT_PUBLIC_APP_NAME: z.string().default("NALCO Intelligence Bot"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  ENABLE_LIVE_INGEST: z.coerce.boolean().default(false),
  ENABLE_PAGE_LOAD_INGEST: z.coerce.boolean().default(false),
  NALCO_MOCK_LIVE_SOURCES: z.coerce.boolean().default(false)
}).transform((value) => ({
  ...value,
  SCRAPER_USER_AGENT: value.SCRAPER_USER_AGENT || value.INGEST_USER_AGENT || "NALCO-Intelligence-Bot/1.0 (+public-demo)"
}));

export const env = envSchema.parse(process.env);
