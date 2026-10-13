import "dotenv/config";

function parseOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

const clientOrigins = parseOrigins(
  process.env.CLIENT_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173",
);

export const config = {
  environment: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT) || 3000,
  clientOrigins,
  defaultGroupCode: process.env.DEFAULT_GROUP_CODE || "261-321",
  campusTimeZone: process.env.CAMPUS_TIME_ZONE || "Europe/Moscow",
  assistantMode: process.env.ASSISTANT_MODE || "verified-data",
  database: {
    connectionString: process.env.DATABASE_URL || "",
    useSsl: parseBoolean(process.env.DATABASE_SSL),
  },
  openAi: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || 20_000,
    maxOutputTokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 600,
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT || "none",
  },
};
