import { spawnSync } from "node:child_process";

const fallbackDatabaseUrl = "postgresql://user:password@localhost:5432/nalco_intelligence";
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || fallbackDatabaseUrl
};

const result = spawnSync("npx", ["prisma", "generate"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
