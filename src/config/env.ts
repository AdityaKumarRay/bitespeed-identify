/** Centralised, validated environment configuration */

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  PORT: parseInt(requireEnv("PORT", "3000"), 10),
  NODE_ENV: requireEnv("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",
} as const;
