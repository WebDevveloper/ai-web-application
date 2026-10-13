function formatCurrentDate() {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function TopBar({ groupCode, onMenuClick }) {
  return (
    <header className="topbar">
      <button className="menu-button" type="button" onClick={onMenuClick} aria-label="Открыть меню">☰</button>
      <div className="today-label"><small>{formatCurrentDate().toUpperCase()}</small><strong>Цифровой кампус</strong></div>
      <div className="top-actions">
        <div className="group-label"><span>Учебная группа</span><strong>{groupCode}</strong></div>
        <span className="mvp-badge">MVP</span>
      </div>
    </header>
  );
}
