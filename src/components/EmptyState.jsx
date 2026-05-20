const suggestions = [
  "Explain React in simple words",
  "Give me 3 ideas for a small web app",
  "Help me improve this text",
];

export default function EmptyState({ onSuggestionClick }) {
  return (
    <section className="mx-auto flex max-w-3xl flex-1 flex-col justify-center py-8 text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-3xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-200">
        AI
      </div>

      <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        What would you like to know?
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
        Start a conversation with the assistant. The chat keeps context while the current session is open and is saved locally in your browser.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
