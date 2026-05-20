export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm">
          AI
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-3xl px-5 py-4 text-[15px] leading-7 shadow-sm ${
          isUser
            ? "rounded-br-lg bg-slate-950 text-white"
            : "rounded-bl-lg border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-200 text-sm font-bold text-slate-700 shadow-sm">
          You
        </div>
      )}
    </article>
  );
}
