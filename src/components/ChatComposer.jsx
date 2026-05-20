import { useEffect, useRef } from "react";

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onVoiceToggle,
  isLoading,
  isListening,
  isVoiceSupported,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-2 shadow-xl shadow-slate-200/70 backdrop-blur">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onVoiceToggle}
          disabled={isLoading || !isVoiceSupported}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg transition ${
            isListening
              ? "bg-rose-100 text-rose-600 ring-2 ring-rose-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          title={isListening ? "Stop voice input" : "Start voice input"}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
        >
          {isListening ? "■" : "🎙"}
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask whatever you want..."
          className="max-h-[180px] min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          title="Send message"
          aria-label="Send message"
        >
          ↑
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-2 text-xs text-slate-400">
        <span>Enter to send · Shift + Enter for a new line</span>
        {!isVoiceSupported && <span>Voice input is not supported</span>}
        {isListening && <span className="font-medium text-rose-500">Listening...</span>}
      </div>
    </div>
  );
}
