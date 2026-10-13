const GROUP_CODE_PATTERN = /^\d{3}-\d{3,4}$/;
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const ALLOWED_RATINGS = new Set(["helpful", "not_helpful"]);

export function normalizeGroupCode(value, fallback = "") {
  const groupCode = typeof value === "string" ? value.trim() : fallback;
  return GROUP_CODE_PATTERN.test(groupCode) ? groupCode : "";
}

export function normalizeMessages(body) {
  const sourceMessages = Array.isArray(body?.messages)
    ? body.messages
    : typeof body?.message === "string"
      ? [{ role: "user", content: body.message }]
      : [];

  return sourceMessages
    .filter(
      (message) =>
        ALLOWED_ROLES.has(message?.role) &&
        typeof message?.content === "string" &&
        message.content.trim(),
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4_000),
    }));
}

export function normalizeFeedback(body) {
  const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";
  const rating = typeof body?.rating === "string" ? body.rating : "";

  if (!messageId || messageId.length > 100 || !ALLOWED_RATINGS.has(rating)) {
    return null;
  }

  return {
    messageId,
    rating,
    comment:
      typeof body?.comment === "string"
        ? body.comment.trim().slice(0, 1_000) || null
        : null,
    intent:
      typeof body?.intent === "string"
        ? body.intent.trim().slice(0, 50) || null
        : null,
    responseHadSources:
      typeof body?.responseHadSources === "boolean"
        ? body.responseHadSources
        : null,
  };
}
