import { useState } from "react";
import { searchDirectory } from "../api/campusApi";
import Icon from "./Icon";

export default function DirectorySearch({ kind, onSelectLocation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isTeacherSearch = kind === "teachers";

  async function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    setResults(null);
    try {
      const data = await searchDirectory(kind, query.trim());
      setResults(data.results);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-label={isTeacherSearch ? "Поиск преподавателя" : "Поиск аудитории"}
    >
      <form className="directory-search" onSubmit={handleSubmit}>
        <label htmlFor={`directory-${kind}`}>
          {isTeacherSearch ? "Фамилия преподавателя" : "Аудитория или корпус"}
        </label>
        <input
          id={`directory-${kind}`}
          value={query}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            isTeacherSearch ? "Например, Зайцев" : "Например, Д108 или БС"
          }
        />
        <button
          className="primary-small"
          type="submit"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? "Ищем…" : "Найти"}
        </button>
      </form>
      <div aria-live="polite">
        {error && <p className="error-banner">{error}</p>}
        {results?.length === 0 && (
          <p>Совпадений не найдено. Попробуйте другую формулировку.</p>
        )}
        {results?.map((item) => (
          <div className="drawer-item" key={item.id}>
            <small>ИЗ ЗАГРУЖЕННОГО СПРАВОЧНИКА</small>
            <strong>
              {isTeacherSearch ? item.fullName : `Аудитория ${item.room}`}
            </strong>
            {isTeacherSearch ? (
              <>
                <span>
                  {[item.department, item.position].filter(Boolean).join(" · ")}
                </span>
                <span>{item.email || "Email не указан"}</span>
                {item.subjects?.length > 0 && (
                  <span>{item.subjects.join(", ")}</span>
                )}
              </>
            ) : (
              <>
                <span>{item.building || "Корпус не указан"}</span>
                <span>
                  {[item.address, item.transport].filter(Boolean).join(" · ")}
                </span>
                {item.address && onSelectLocation && (
                  <button
                    className="secondary-button"
                    onClick={() => onSelectLocation(item)}
                  >
                    <Icon name="pin" />
                    Показать корпус на карте
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
