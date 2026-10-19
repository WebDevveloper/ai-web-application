import DirectorySearch from "./DirectorySearch";

function DrawerItem({ label, title, description }) {
  return (
    <div className="drawer-item">
      <small>{label}</small>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export default function ContextDrawer({ dashboard, name, onClose }) {
  if (!name) {
    return null;
  }

  const lessons = dashboard?.lessons || [];
  const deadlines = dashboard?.deadlines || [];
  const locations = dashboard?.locations || [];

  return (
    <>
      <button
        className="drawer-backdrop"
        type="button"
        onClick={onClose}
        aria-label="Закрыть панель"
      />
      <aside className="context-drawer" aria-label="Дополнительная информация">
        <button
          className="drawer-close"
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        {name === "day" && (
          <>
            <div className="drawer-label">МОЙ ДЕНЬ</div>
            <h2>Расписание и сроки</h2>
            <p>Данные для выбранной учебной группы.</p>
            <div className="drawer-list">
              {lessons.map((lesson) => (
                <DrawerItem
                  key={lesson.id}
                  label={
                    lesson.startTime && lesson.endTime
                      ? `${lesson.startTime.slice(0, 5)}—${lesson.endTime.slice(0, 5)}`
                      : "Время уточняется"
                  }
                  title={lesson.subject}
                  description={`${lesson.room || "Аудитория уточняется"}${lesson.building ? ` · ${lesson.building}` : ""}`}
                />
              ))}
              {deadlines.map((deadline) => (
                <DrawerItem
                  key={deadline.id}
                  label={deadline.dueLabel || "ДЕДЛАЙН"}
                  title={deadline.title}
                  description={deadline.subject || "Учебная задача"}
                />
              ))}
              {lessons.length === 0 && deadlines.length === 0 && (
                <DrawerItem
                  label="НЕТ ЗАПИСЕЙ"
                  title="Данных на сегодня нет"
                  description="Это не подтверждает отсутствие занятий и сроков. Сверьтесь с официальными сервисами."
                />
              )}
            </div>
          </>
        )}

        {name === "campus" && (
          <>
            <div className="drawer-label">НАВИГАЦИЯ ПО КАМПУСУ</div>
            <h2>Корпуса и аудитории</h2>
            <p>Адреса и ориентиры берутся из кампусного справочника.</p>
            <DirectorySearch key="rooms" kind="rooms" />
            <div className="drawer-list">
              {locations.map((location) => (
                <DrawerItem
                  key={location.id}
                  label={location.type || "МЕСТО"}
                  title={location.name}
                  description={[location.address, location.directions]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))}
              {locations.length === 0 && (
                <DrawerItem
                  label="СПРАВОЧНИК"
                  title="Места пока не загружены"
                  description="Справочник временно недоступен или ещё не подключён."
                />
              )}
            </div>
          </>
        )}

        {name === "teachers" && (
          <>
            <div className="drawer-label">СПРАВОЧНИК</div>
            <h2>Преподаватели</h2>
            <p>
              Контакты и дисциплины из загруженных данных. Отсутствующий email
              не подбирается автоматически.
            </p>
            <DirectorySearch key="teachers" kind="teachers" />
          </>
        )}

        {name === "help" && (
          <>
            <div className="drawer-label">ПОМОЩЬ И ОБРАЩЕНИЯ</div>
            <h2>Найти ответственного</h2>
            <p>
              Ассистент подскажет подразделение и подготовит черновик. Отправка
              обращения требует подтверждения пользователя.
            </p>
            <div className="drawer-list">
              <DrawerItem
                label="УЧЕБНЫЙ ПРОЦЕСС"
                title="Расписание, ведомости и справки"
                description="Учебный офис факультета"
              />
              <DrawerItem
                label="ТЕХНИЧЕСКАЯ ПРОБЛЕМА"
                title="Не работает личный кабинет"
                description="Служба поддержки цифровых сервисов"
              />
              <DrawerItem
                label="ДОСТУП В КОРПУС"
                title="Пропуск или турникет"
                description="Бюро пропусков"
              />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
