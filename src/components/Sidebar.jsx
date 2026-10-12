export default function Sidebar({
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
      {isMobileOpen && <button className="sidebar-backdrop" type="button" onClick={onCloseMobile} aria-label="Закрыть меню" />}
      <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div><strong>Политех</strong><small>Навигатор</small></div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          <button className={`nav-item ${activeView === "home" ? "active" : ""}`} type="button" onClick={() => onViewChange("home")}>
            <span className="nav-symbol">⌂</span><span>Главная</span>
          </button>
          <button className={`nav-item ${activeView === "chat" ? "active" : ""}`} type="button" onClick={() => onViewChange("chat")}>
            <span className="nav-symbol">↗</span><span>Диалог</span>
          </button>
          <button className="nav-item" type="button" onClick={() => onOpenDrawer("day")}>
            <span className="nav-symbol">12</span><span>Мой день</span>
          </button>
          <button className="nav-item" type="button" onClick={() => onOpenDrawer("campus")}>
            <span className="nav-symbol">◎</span><span>Кампус</span>
          </button>
          <button className="nav-item" type="button" onClick={() => onOpenDrawer("help")}>
            <span className="nav-symbol">?</span><span>Помощь</span>
          </button>
        </nav>

        <section className="recent-chats" aria-label="Последние диалоги">
          <div className="recent-chats-head"><small>ПОСЛЕДНИЕ ДИАЛОГИ</small><button type="button" onClick={onNewChat} aria-label="Новый диалог">＋</button></div>
          {chats.slice(0, 3).map((chat) => (
            <div className={`recent-chat ${chat.id === activeChatId ? "selected" : ""}`} key={chat.id}>
              <button type="button" onClick={() => onSelectChat(chat.id)}>{chat.title}</button>
              {chats.length > 1 && <button className="delete-chat" type="button" onClick={() => onDeleteChat(chat.id)} aria-label={`Удалить диалог ${chat.title}`}>×</button>}
            </div>
          ))}
        </section>

        <div className={`source-status ${sourceStatus.state}`}>
          <span />
          <div><strong>{sourceStatus.title}</strong><small>{sourceStatus.details}</small></div>
        </div>

        <div className="profile">
          <span className="avatar">С</span>
          <span><strong>Студент</strong><small>{groupCode} · 1 курс</small></span>
        </div>
      </aside>
    </>
  );
}
