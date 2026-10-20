import { writeFile } from "node:fs/promises";

const target = process.env.API_PROXY_TARGET?.trim();
if (target) {
  const url = new URL(target);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "API_PROXY_TARGET должен быть HTTPS-адресом backend без пути, логина и параметров.",
    );
  }
  if (process.env.VITE_API_URL?.trim())
    throw new Error("Для Netlify proxy оставьте VITE_API_URL пустым.");
  await writeFile(
    new URL("../dist/_redirects", import.meta.url),
    `/api/* ${url.origin}/api/:splat 200\n`,
  );
  console.log("Создан маршрут /api для Netlify proxy.");
}
