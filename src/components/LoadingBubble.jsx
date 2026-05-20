export default function LoadingBubble() {
  return (
    <div className="flex justify-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm">
        AI
      </div>

      <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
}
