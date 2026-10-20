import Icon from "./Icon";

export default function Sidebar({
  user,
  onOpenAccount,
  onLogout,
  activeView,
  activeChatId,
  chats,
  groupCode,
  isMobileOpen,
  sourceStatus,
  onCloseMobile,
  onDeleteChat,
  onNewChat,
  onOpenDrawer,
  onSelectChat,
  onViewChange,
}) {
  return (
    <>
      {isMobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={onCloseMobile}
          aria-label="Закрыть меню"
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <strong>Политех</strong>
            <small>Навигатор</small>
          </div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          <button
            className={`nav-item ${activeView === "home" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("home")}
          >
            <Icon name="home" />
            <span>Главная</span>
          </button>
          <button
            className={`nav-item ${activeView === "chat" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("chat")}
          >
            <Icon name="chat" />
            <span>Диалог</span>
          </button>
          <button
            className={`nav-item ${activeView === "calendar" ? "active" : ""}`}
            type="button"
            onClick={() => onOpenDrawer("calendar")}
          >
            <Icon name="calendar" />
            <span>Календарь</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => onOpenDrawer("campus")}
          >
            <Icon name="pin" />
            <span>Кампус</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => onOpenDrawer("help")}
          >
            <Icon name="book" />
            <span>Помощь</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => onOpenDrawer("teachers")}
          >
            <Icon name="teacher" />
            <span>Преподаватели</span>
          </button>
        </nav>

        <section className="recent-chats" aria-label="Последние диалоги">
          <div className="recent-chats-head">
            <small>ПОСЛЕДНИЕ ДИАЛОГИ</small>
            <button type="button" onClick={onNewChat} aria-label="Новый диалог">
              <Icon name="plus" />
            </button>
          </div>
          {chats.slice(0, 3).map((chat) => (
            <div
              className={`recent-chat ${chat.id === activeChatId ? "selected" : ""}`}
              key={chat.id}
            >
              <button type="button" onClick={() => onSelectChat(chat.id)}>
                {chat.title}
              </button>
              {chats.length > 1 && (
                <button
                  className="delete-chat"
                  type="button"
                  onClick={() => onDeleteChat(chat.id)}
                  aria-label={`Удалить диалог ${chat.title}`}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          ))}
        </section>

        <div className={`source-status ${sourceStatus.state}`}>
          <span />
          <div>
            <strong>{sourceStatus.title}</strong>
            <small>{sourceStatus.details}</small>
          </div>
        </div>

        <button className="profile" type="button" onClick={onOpenAccount}>
          <span className="avatar">
            {user?.displayName?.[0]?.toUpperCase() || "С"}
          </span>
          <span>
            <strong>{user?.displayName || "Гостевой профиль"}</strong>
            <small>
              {groupCode} · {user ? "Моя группа" : "Выбрать группу / войти"}
            </small>
          </span>
        </button>
        {user && (
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" />
            Выйти
          </button>
        )}
      </aside>
    </>
  );
}
