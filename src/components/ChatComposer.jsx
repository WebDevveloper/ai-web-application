import Icon from "./Icon";
import { useEffect, useRef } from "react";

export default function ChatComposer({ value, onChange, onSubmit, isLoading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer">
        <button
          className="attach-button"
          type="button"
          aria-label="Прикрепить файл"
          disabled
        >
          <Icon name="plus" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Напишите вопрос о кампусе…"
        />
        <button
          className="send-button"
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          aria-label="Отправить сообщение"
        >
          <Icon name="arrowRight" />
        </button>
      </div>
      <p className="composer-note">
        Ответы основаны на подключённых источниках. Важные решения лучше
        подтвердить у ответственного подразделения.
      </p>
    </div>
  );
}
