import { useEffect, useState } from "react";
import { getScheduleWeek } from "../api/campusApi";
import {
  campusToday,
  formatCalendarDate,
  mondayOf,
  shiftDate,
} from "../utils/calendarDates";
import Icon from "./Icon";

export default function WeekCalendar({
  groupCode,
  onAsk,
  onOpenCampus,
  initialDate,
}) {
  const [startDate, setStartDate] = useState(() =>
    mondayOf(initialDate || campusToday()),
  );
  const [week, setWeek] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function loadWeek() {
      setIsLoading(true);
      setError("");
      setWeek(null);
      try {
        const data = await getScheduleWeek(groupCode, startDate);
        if (!cancelled) setWeek(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadWeek();
    return () => {
      cancelled = true;
    };
  }, [groupCode, startDate]);
  const days =
    week?.days ||
    Array.from({ length: 7 }, (_, index) => ({
      date: shiftDate(startDate, index),
      lessons: [],
    }));
  return (
    <section className="calendar-view">
      <header className="page-heading">
        <div>
          <div className="eyebrow dark">УЧЕБНАЯ НЕДЕЛЯ / {groupCode}</div>
          <h1>Календарь</h1>
          <p className="muted">
            Занятия и сроки вашей группы. Изменения сверяйте с официальным
            расписанием.
          </p>
        </div>
        <span className="calendar-seal" aria-hidden="true">
          <Icon name="calendar" />
        </span>
      </header>
      <div className="calendar-toolbar">
        <div className="week-switch">
          <button
            className="icon-button"
            aria-label="Предыдущая неделя"
            onClick={() => setStartDate(shiftDate(startDate, -7))}
          >
            <Icon name="arrowLeft" />
          </button>
          <strong>
            {formatCalendarDate(startDate, { day: "numeric", month: "short" })}{" "}
            —{" "}
            {formatCalendarDate(shiftDate(startDate, 6), {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </strong>
          <button
            className="icon-button"
            aria-label="Следующая неделя"
            onClick={() => setStartDate(shiftDate(startDate, 7))}
          >
            <Icon name="arrowRight" />
          </button>
        </div>
        <label className="date-picker">
          Перейти к дате
          <input
            type="date"
            value={startDate}
            min="2000-01-01"
            max="2099-12-31"
            onChange={(event) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value))
                setStartDate(mondayOf(event.target.value));
            }}
          />
        </label>
        <button
          className="secondary-button"
          onClick={() => setStartDate(mondayOf(campusToday()))}
        >
          Текущая неделя
        </button>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="week-grid" aria-busy={isLoading}>
        {days.map((day) => {
          const deadlines = (week?.deadlines || []).filter(
            (item) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Europe/Moscow",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(item.dueAt)) === day.date,
          );
          return (
            <article
              className={`calendar-day ${day.date === campusToday() ? "is-today" : ""}`}
              key={day.date}
            >
              <header>
                <small>
                  {formatCalendarDate(day.date, { weekday: "short" })}
                </small>
                <strong>
                  {formatCalendarDate(day.date, { day: "numeric" })}
                </strong>
                {day.date === campusToday() && <span>Сегодня</span>}
              </header>
              {isLoading ? (
                <p className="muted">Загружаем…</p>
              ) : (
                !error && (
                  <>
                    {day.lessons.length === 0 && (
                      <p className="calendar-empty">Нет записей о занятиях</p>
                    )}
                    {day.lessons.map((lesson) => (
                      <div className="calendar-lesson" key={lesson.id}>
                        <time>
                          {lesson.startTime?.slice(0, 5) || "Время уточняется"}
                          {lesson.endTime
                            ? ` — ${lesson.endTime.slice(0, 5)}`
                            : ""}
                        </time>
                        <small>{lesson.lessonType || "Занятие"}</small>
                        <h3>{lesson.subject}</h3>
                        {lesson.teacherName && <p>{lesson.teacherName}</p>}
                        <button
                          className="lesson-location"
                          onClick={() => onOpenCampus(lesson)}
                        >
                          <Icon name="pin" />
                          {lesson.room || lesson.building || "Уточнить место"}
                        </button>
                      </div>
                    ))}
                    {deadlines.map((deadline) => (
                      <div className="calendar-deadline" key={deadline.id}>
                        <small>СРОК СДАЧИ</small>
                        <strong>{deadline.title}</strong>
                      </div>
                    ))}
                    <button
                      className="day-question"
                      onClick={() => onAsk(`Расписание на ${day.date}`)}
                    >
                      Спросить о дне
                      <Icon name="arrowRight" />
                    </button>
                  </>
                )
              )}
            </article>
          );
        })}
      </div>
      <p className="calendar-note">
        Пустой день означает отсутствие записей в источнике. Подгруппы и
        переносы могут потребовать уточнения.
      </p>
      <button
        className="secondary-button"
        onClick={() => onAsk(`Расписание на неделю с ${startDate}`)}
      >
        <Icon name="chat" />
        Обсудить неделю в диалоге
      </button>
    </section>
  );
}
