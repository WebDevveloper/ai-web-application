import { useState } from "react";
import { sendFeedback } from "../api/campusApi";

function SourceCard({ source }) {
  const updatedAt = source.updatedAt
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(source.updatedAt))
    : null;
  const content = (
    <>
      <small>ПРОВЕРЕННЫЙ ИСТОЧНИК</small>
      <strong>{source.title}</strong>
      <span>{updatedAt ? `Проверено ${updatedAt}` : source.section}</span>
    </>
  );

  if (source.url) {
    return (
      <a className="source-card" href={source.url} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <div className="source-card">{content}</div>;
}

export default function ChatMessage({ message, onAction }) {
  const [feedbackState, setFeedbackState] = useState("idle");
  const isUser = message.role === "user";

  async function handleFeedback(rating) {
    setFeedbackState("saving");

    try {
      await sendFeedback({
        messageId: message.id,
        rating,
        intent: message.answerType,
        responseHadSources: Boolean(message.sources?.length),
      });
      setFeedbackState("saved");
    } catch {
      setFeedbackState("error");
    }
  }

  if (isUser) {
    return (
      <article className="message user-message">
        <div className="user-bubble">{message.content}</div>
      </article>
    );
  }

  return (
    <article className="message assistant-message">
      <div className="assistant-avatar" aria-hidden="true">ПН</div>
      <div className="assistant-message-body">
        <div className="assistant-bubble">
          <p className="answer-text">{message.content}</p>

          {message.sources?.length > 0 && (
            <div className="source-list">
              {message.sources.map((source) => (
                <SourceCard key={source.id || `${source.title}-${source.section}`} source={source} />
              ))}
            </div>
          )}

          {message.actions?.length > 0 && (
            <div className="answer-actions">
              {message.actions.map((action) => (
                <button key={`${action.type}-${action.label}`} type="button" onClick={() => onAction(action)}>
                  {action.label} →
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="feedback-row">
          {feedbackState === "saved" ? (
            <span>Спасибо за оценку</span>
          ) : (
            <>
              <span>{feedbackState === "error" ? "Не удалось сохранить" : "Ответ помог?"}</span>
              <button type="button" onClick={() => handleFeedback("helpful")} disabled={feedbackState === "saving"} aria-label="Ответ помог">＋</button>
              <button type="button" onClick={() => handleFeedback("not_helpful")} disabled={feedbackState === "saving"} aria-label="Ответ не помог">−</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
