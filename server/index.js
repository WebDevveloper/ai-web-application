import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mistralApiUrl = "https://api.mistral.ai/v1/chat/completions";

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

function normalizeMessages(body) {
  if (Array.isArray(body.messages)) {
    return body.messages
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return [
      {
        role: "user",
        content: body.message.trim(),
      },
    ];
  }

  return [];
}

app.post("/api/chat", async (req, res) => {
  const messages = normalizeMessages(req.body);

  if (messages.length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!process.env.MISTRAL_API_KEY) {
    return res.status(500).json({
      error: "Mistral API key is not configured.",
    });
  }

  try {
    const mistralResponse = await fetch(mistralApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Give clear and practical answers.",
          },
          ...messages,
        ],
      }),
    });

    const data = await mistralResponse.json().catch(() => null);

    if (!mistralResponse.ok) {
      console.error("Mistral API error:", data);

      return res.status(mistralResponse.status).json({
        error:
          data?.message ||
          data?.error?.message ||
          "Mistral API returned an error.",
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    res.json({
      answer: answer || "The AI service returned an empty response.",
    });
  } catch (error) {
    console.error("AI request failed:", error);

    res.status(500).json({
      error: "Failed to get a response from the AI service.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
