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
  database: {
    connectionString: process.env.DATABASE_URL || "",
    useSsl: parseBoolean(process.env.DATABASE_SSL),
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || "",
    model: process.env.MISTRAL_MODEL || "mistral-small-latest",
    timeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS) || 20_000,
  },
};
