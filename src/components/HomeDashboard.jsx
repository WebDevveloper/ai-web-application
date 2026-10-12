import { useState } from "react";

const suggestedQuestions = [
  "Что мне нужно сделать до конца недели?",
  "Где находится мой учебный офис?",
  "Как оформить академический отпуск?",
];

function formatTime(value) {
  return value ? value.slice(0, 5) : "—";
}

export default function HomeDashboard({ dashboard, error, groupCode, isLoading, onAsk, onOpenDrawer }) {
  const [question, setQuestion] = useState("");
  const lessons = dashboard?.lessons || [];
  const nextDeadline = dashboard?.deadlines?.[0];

  function handleSubmit(event) {
    event.preventDefault();
    const cleanQuestion = question.trim();

    if (cleanQuestion) {
      onAsk(cleanQuestion);
      setQuestion("");
    }
  }

  return (
    <section className="home-view">
      <section className="hero-card">
        <div className="route-art" aria-hidden="true"><span className="route-dot dot-a" /><span className="route-dot dot-b" /><span className="route-dot dot-c" /></div>
        <div className="hero-copy">
          <div className="eyebrow"><span /> ПОМОЩНИК ПО КАМПУСУ</div>
          <h1>Что нужно<br />узнать или сделать?</h1>
          <p>Найду ответ в материалах Политеха, покажу источник и помогу перейти к следующему шагу.</p>
        </div>
        <form className="ask-box" onSubmit={handleSubmit}>
          <label htmlFor="home-question">Ваш вопрос</label>
          <div className="ask-row">
            <input id="home-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Например, где получить справку об обучении?" />
            <button type="submit" aria-label="Отправить вопрос" disabled={!question.trim()}>→</button>
          </div>
          <div className="suggestion-row">
            {suggestedQuestions.map((item) => <button key={item} type="button" onClick={() => onAsk(item)}>{item}</button>)}
          </div>
        </form>
      </section>

      {error && <div className="dashboard-notice"><strong>Данные кампуса пока не загружены.</strong><span>{error}</span></div>}

      <section className="home-grid" aria-busy={isLoading}>
        <article className="card day-card">
          <div className="card-head"><div><span className="section-index">01</span><h2>Сегодня</h2></div><button className="text-button" type="button" onClick={() => onOpenDrawer("day")}>Весь день →</button></div>
          {isLoading ? <div className="card-skeleton" /> : lessons.length > 0 ? (
            <div className="timeline">
              {lessons.slice(0, 2).map((lesson, index) => (
                <div className={`timeline-item ${index === 0 ? "current" : ""}`} key={lesson.id}>
                  <time>{formatTime(lesson.startTime)}</time><span className="timeline-node" />
                  <div><small>{index === 0 ? "БЛИЖАЙШАЯ ПАРА" : "ДАЛЕЕ"}</small><strong>{lesson.subject}</strong><p>{lesson.room || "Аудитория уточняется"}{lesson.building ? ` · ${lesson.building}` : ""}</p></div>
                  <button type="button" onClick={() => onOpenDrawer("campus")} aria-label="Показать маршрут">↗</button>
                </div>
              ))}
            </div>
          ) : <p className="empty-card-text">На сегодня занятий в подключённом расписании нет.</p>}
        </article>

        <article className="card deadline-card">
          <div className="card-head"><div><span className="section-index coral">02</span><h2>Ближайший срок</h2></div>{nextDeadline && <span className="deadline-chip">важно</span>}</div>
          {isLoading ? <div className="card-skeleton" /> : nextDeadline ? (
            <div className="deadline-content">
              <div className="date-block"><strong>{nextDeadline.dueTime ? formatTime(nextDeadline.dueTime) : "23:59"}</strong><span>{nextDeadline.dueLabel}</span></div>
              <h3>{nextDeadline.title}</h3><p>{nextDeadline.subject || `Группа ${groupCode}`}</p>
              <div className="deadline-actions"><button className="primary-small" type="button" onClick={() => onAsk(`Что нужно для выполнения: ${nextDeadline.title}?`)}>Условия</button><button className="secondary-small" type="button" onClick={() => onOpenDrawer("day")}>Все сроки</button></div>
            </div>
          ) : <p className="empty-card-text">Ближайшие дедлайны не найдены.</p>}
        </article>

        <article className="card quick-card">
          <div className="card-head"><div><span className="section-index mint">03</span><h2>Найти быстро</h2></div></div>
          <div className="quick-links">
            <button type="button" onClick={() => onOpenDrawer("campus")}><i>◎</i><span><strong>Корпус или аудитория</strong><small>Маршрут и вход</small></span><b>→</b></button>
            <button type="button" onClick={() => onAsk("Куда обратиться по организационному вопросу?")}><i>↗</i><span><strong>К кому обратиться</strong><small>Контакты и часы работы</small></span><b>→</b></button>
            <button type="button" onClick={() => onAsk("Какие документы нужны для справки об обучении?")}><i>≡</i><span><strong>Документы и справки</strong><small>Порядок получения</small></span><b>→</b></button>
          </div>
        </article>
      </section>
    </section>
  );
}
