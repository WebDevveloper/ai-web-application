import { useState } from "react";
import { apiRequest } from "../api/http";
import Modal from "./Modal";
import Icon from "./Icon";

const titles = {
  login: "С возвращением",
  register: "Создать профиль",
  guest: "Выберите группу",
};
const submitLabels = {
  login: "Войти",
  register: "Создать аккаунт",
  guest: "Сохранить группу",
  profile: "Сохранить группу",
};

export default function AccountDialog({
  user,
  groupCode,
  groups,
  groupsError,
  onAccountChange,
  onGuestGroupChange,
  onClose,
}) {
  const [mode, setMode] = useState(user ? "profile" : "login");
  const [selectedGroup, setSelectedGroup] = useState(groupCode);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasGroup = groups.some((group) => group.code === selectedGroup);
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "guest") {
        onGuestGroupChange(selectedGroup);
        onClose();
        return;
      }
      const path = mode === "profile" ? "/auth/profile" : `/auth/${mode}`;
      const data = await apiRequest(path, {
        method: mode === "profile" ? "PATCH" : "POST",
        body: JSON.stringify({ ...fields, groupCode: selectedGroup }),
      });
      onAccountChange(data.user);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }
  const needsGroup = mode !== "login";
  return (
    <Modal title="Учебный профиль" className="account-dialog" onClose={onClose}>
      <div className="eyebrow dark">УЧЕБНЫЙ ПРОФИЛЬ</div>
      <h2>{mode === "profile" ? user.displayName : titles[mode]}</h2>
      <p className="muted">
        {user
          ? "Группа определяет расписание, сроки и контекст диалога."
          : "Аккаунт сохраняет вашу группу. Это отдельный сервис проекта, а не вход в личный кабинет университета."}
      </p>
      {!user && (
        <div className="account-tabs" aria-label="Режим входа">
          {[
            ["login", "Войти"],
            ["register", "Регистрация"],
            ["guest", "Без аккаунта"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <form className="account-form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <label>
            Как вас называть
            <input
              name="displayName"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={60}
            />
          </label>
        )}
        {["login", "register"].includes(mode) && (
          <>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={12}
                required
                aria-describedby="password-note"
              />
            </label>
            <small id="password-note" className="muted">
              От 12 символов, до 72 байт UTF-8. Кириллица занимает больше одного
              байта.
            </small>
          </>
        )}
        {needsGroup && (
          <label>
            Учебная группа
            <input
              list="study-group-options"
              value={selectedGroup}
              onChange={(event) =>
                setSelectedGroup(event.target.value.toUpperCase())
              }
              placeholder="Начните вводить номер"
              required
              maxLength={20}
              autoComplete="off"
            />
            <datalist id="study-group-options">
              {groups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.course ? `${group.course} курс` : ""}
                </option>
              ))}
            </datalist>
            {!hasGroup && (
              <small className="muted">
                Выберите существующий номер из списка.
              </small>
            )}
          </label>
        )}
        {groupsError && needsGroup && (
          <p className="error-banner" role="alert">
            {groupsError}
          </p>
        )}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button"
          type="submit"
          disabled={isSaving || (needsGroup && !hasGroup)}
        >
          <Icon name={mode === "login" ? "login" : "check"} />
          {isSaving ? "Сохраняем…" : submitLabels[mode]}
        </button>
      </form>
      {mode === "register" && (
        <p className="form-note">
          Используйте отдельный пароль. Email и принадлежность к группе пока не
          подтверждаются университетом. Восстановление пароля в этой версии не
          подключено.
        </p>
      )}
    </Modal>
  );
}
