import DirectorySearch from "./DirectorySearch";
import { useState } from "react";
import Modal from "./Modal";
import Icon from "./Icon";
import CampusMap from "./CampusMap";

function CampusPanel({ locations }) {
  const [selectedLocation, setSelectedLocation] = useState(
    locations[0] || null,
  );
  return (
    <>
      <DirectorySearch
        key="rooms"
        kind="rooms"
        onSelectLocation={setSelectedLocation}
      />
      <div className="building-list" aria-label="Выберите корпус">
        {locations.map((location) => (
          <button
            key={location.id}
            aria-pressed={selectedLocation?.id === location.id}
            onClick={() => setSelectedLocation(location)}
          >
            <Icon name="pin" />
            <span>
              <strong>{location.name}</strong>
              <small>{location.address}</small>
            </span>
            <Icon name="arrowRight" />
          </button>
        ))}
      </div>
      {selectedLocation && (
        <section className="selected-building">
          <h3>{selectedLocation.name || selectedLocation.building}</h3>
          <p>{selectedLocation.address}</p>
          <p>{selectedLocation.directions || selectedLocation.transport}</p>
          <CampusMap
            key={`${selectedLocation.id}:${selectedLocation.address}`}
            address={selectedLocation.address}
            name={selectedLocation.name || selectedLocation.building}
          />
        </section>
      )}
      {locations.length === 0 && <p>Корпуса пока не загружены.</p>}
    </>
  );
}

function DrawerItem({ label, title, description }) {
  return (
    <div className="drawer-item">
      <small>{label}</small>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export default function ContextDrawer({
  dashboard,
  name,
  onClose,
  onAsk,
  onOpenCalendar,
}) {
  if (!name) {
    return null;
  }

  const lessons = dashboard?.lessons || [];
  const deadlines = dashboard?.deadlines || [];
  const locations = dashboard?.locations || [];

  return (
    <Modal
      title="Дополнительная информация"
      className="context-drawer"
      onClose={onClose}
    >
      {name === "day" && (
        <>
          <div className="drawer-label">МОЙ ДЕНЬ</div>
          <h2>Расписание и сроки</h2>
          <p>Данные для выбранной учебной группы.</p>
          <button className="secondary-button" onClick={onOpenCalendar}>
            <Icon name="calendar" />
            Открыть неделю
          </button>
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
          <CampusPanel locations={locations} />
        </>
      )}

      {name === "teachers" && (
        <>
          <div className="drawer-label">СПРАВОЧНИК</div>
          <h2>Преподаватели</h2>
          <p>
            Контакты и дисциплины из загруженных данных. Отсутствующий email не
            подбирается автоматически.
          </p>
          <DirectorySearch key="teachers" kind="teachers" />
        </>
      )}

      {name === "help" && (
        <>
          <div className="drawer-label">ПОМОЩЬ И ОБРАЩЕНИЯ</div>
          <h2>Найти ответственного</h2>
          <p>
            Выберите тему — откроется диалог с вопросом. Навигатор найдёт
            порядок действий или контакты в подключённых источниках.
          </p>
          <div className="drawer-list">
            {[
              [
                "УЧЕБНЫЙ ПРОЦЕСС",
                "Документы и справки",
                "Как получить справку об обучении?",
                "document",
              ],
              [
                "ТЕХНИЧЕСКАЯ ПРОБЛЕМА",
                "Не работает личный кабинет",
                "Куда обратиться, если не работает личный кабинет?",
                "chat",
              ],
              [
                "ДОСТУП В КОРПУС",
                "Пропуск или турникет",
                "Куда обратиться, если не работает пропуск в корпус?",
                "pin",
              ],
            ].map(([label, title, question, icon]) => (
              <button
                className="help-topic drawer-item"
                key={title}
                onClick={() => onAsk(question)}
              >
                <Icon name={icon} />
                <span>
                  <small>{label}</small>
                  <strong>{title}</strong>
                  <span>Задать вопрос в диалоге</span>
                </span>
                <Icon name="arrowRight" />
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
