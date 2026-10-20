const suggestions = [
  "Как получить справку в социальные учреждения?",
  "Где находится главный корпус?",
  "Куда написать, если не работает LMS?",
];

export default function EmptyState({ onSuggestionClick }) {
  return (
    <section className="empty-state">
      <div className="assistant-orbit" aria-hidden="true">
        <span />
      </div>
      <h2>С чего начнём?</h2>
      <p>
        Я ищу ответы в материалах Политеха и показываю, откуда взята информация.
      </p>
      <div className="empty-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
