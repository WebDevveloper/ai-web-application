const suggestions = [
  "Что мне нужно сделать до конца недели?",
  "Где находится мой учебный офис?",
  "Как оформить академический отпуск?",
];

export default function EmptyState({ onSuggestionClick }) {
  return (
    <section className="empty-state">
      <div className="assistant-orbit" aria-hidden="true"><span /></div>
      <h2>С чего начнём?</h2>
      <p>Я ищу ответы в материалах Политеха и показываю, откуда взята информация.</p>
      <div className="empty-suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => onSuggestionClick(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
