import Icon from "./Icon";

function formatCurrentDate() {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(new Date());
}

export default function TopBar({
  groupCode,
  onMenuClick,
  onOpenAccount,
  user,
}) {
  return (
    <header className="topbar">
      <button
        className="menu-button icon-button"
        type="button"
        onClick={onMenuClick}
        aria-label="Открыть меню"
      >
        <Icon name="menu" />
      </button>
      <div className="today-label">
        <small>{formatCurrentDate().toUpperCase()}</small>
        <strong>Цифровой кампус</strong>
      </div>
      <div className="top-actions">
        <button
          className="group-label"
          onClick={onOpenAccount}
          aria-label={`Учебная группа ${groupCode}, изменить`}
        >
          <span>Учебная группа</span>
          <strong>
            {groupCode}
            <Icon name="chevron" />
          </strong>
        </button>
        {!user && (
          <button className="login-button" onClick={onOpenAccount}>
            <Icon name="login" />
            <span>Войти</span>
          </button>
        )}
      </div>
    </header>
  );
}
