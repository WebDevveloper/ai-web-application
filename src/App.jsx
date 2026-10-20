import { useEffect, useMemo, useRef, useState } from "react";
import { askAssistant } from "./api/chatApi";
import { getDashboard, getGroups } from "./api/campusApi";
import { apiRequest } from "./api/http";
import AccountDialog from "./components/AccountDialog";
import WeekCalendar from "./components/WeekCalendar";
import Icon from "./components/Icon";
import ChatComposer from "./components/ChatComposer";
import ChatMessage from "./components/ChatMessage";
import ContextDrawer from "./components/ContextDrawer";
import EmptyState from "./components/EmptyState";
import HomeDashboard from "./components/HomeDashboard";
import LoadingBubble from "./components/LoadingBubble";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

const CHAT_STORAGE_KEY = "polytech-navigator-chats";
const DEFAULT_GROUP_CODE = import.meta.env.VITE_DEFAULT_GROUP_CODE || "261-321";

function createChat() {
  return {
    id: crypto.randomUUID(),
    title: "Новый диалог",
    messages: [],
    updatedAt: Date.now(),
  };
}

function createMessage(role, content, extra = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...extra,
  };
}

function getChatTitle(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length <= 42) {
    return cleanText || "Новый диалог";
  }

  return `${cleanText.slice(0, 42)}…`;
}

function loadChats(storageKey) {
  try {
    const savedValue = localStorage.getItem(storageKey);

    if (!savedValue) {
      const firstChat = createChat();
      return { chats: [firstChat], activeChatId: firstChat.id };
    }

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue.chats) || parsedValue.chats.length === 0) {
      throw new Error("История диалогов повреждена");
    }

    return {
      chats: parsedValue.chats,
      activeChatId: parsedValue.activeChatId || parsedValue.chats[0].id,
    };
  } catch {
    const firstChat = createChat();
    return { chats: [firstChat], activeChatId: firstChat.id };
  }
}

function getSourceStatus(isLoading, error, navigator) {
  if (isLoading)
    return {
      state: "loading",
      title: "Загружаем данные",
      details: "расписание и справочники кампуса",
    };
  if (error)
    return {
      state: "error",
      title: "Источники недоступны",
      details: "попробуйте зайти позднее",
    };
  if (navigator?.enabled)
    return {
      state: "ready",
      title: "Снимок данных подключён",
      details: "изменения сверяйте с расписанием",
    };
  return {
    state: "ready",
    title: "Источники подключены",
    details: "даты проверки указаны в ответах",
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [guestGroup, setGuestGroup] = useState(() => {
    try {
      return localStorage.getItem("campus-guest-group") || DEFAULT_GROUP_CODE;
    } catch {
      return DEFAULT_GROUP_CODE;
    }
  });
  const [groups, setGroups] = useState([]);
  const [groupsError, setGroupsError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiRequest("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false);
      });
    getGroups()
      .then((data) => {
        if (!cancelled) setGroups(data.groups);
      })
      .catch((error) => {
        if (!cancelled) setGroupsError(error.message);
      });
    function handleExpiredSession() {
      setUser(null);
      setSessionNotice(
        "Сессия завершилась. Войдите снова, чтобы продолжить со своей группой.",
      );
    }
    window.addEventListener("campus-session-expired", handleExpiredSession);
    return () => {
      cancelled = true;
      window.removeEventListener(
        "campus-session-expired",
        handleExpiredSession,
      );
    };
  }, []);
  const groupCode = user?.groupCode || guestGroup;
  function changeGuestGroup(code) {
    setGuestGroup(code);
    try {
      localStorage.setItem("campus-guest-group", code);
    } catch {
      /* Выбор останется в памяти до закрытия страницы. */
    }
  }
  async function logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
    } catch (error) {
      setSessionNotice(error.message);
    }
  }
  if (isSessionLoading)
    return (
      <div className="app-loading" role="status">
        Открываем кампус…
      </div>
    );
  return (
    <>
      {sessionNotice && (
        <div className="session-notice" role="status">
          {sessionNotice}
          <button
            className="icon-button"
            aria-label="Скрыть уведомление"
            onClick={() => setSessionNotice("")}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      <CampusApp
        key={`${user?.id || "guest"}:${groupCode}`}
        user={user}
        groupCode={groupCode}
        onOpenAccount={() => setIsAccountOpen(true)}
        onLogout={logout}
      />
      {isAccountOpen && (
        <AccountDialog
          user={user}
          groupCode={groupCode}
          groups={groups}
          groupsError={groupsError}
          onAccountChange={(account) => {
            setUser(account);
            setSessionNotice("");
          }}
          onGuestGroupChange={changeGuestGroup}
          onClose={() => setIsAccountOpen(false)}
        />
      )}
    </>
  );
}

function CampusApp({ user, groupCode, onOpenAccount, onLogout }) {
  const storageKey = `${CHAT_STORAGE_KEY}:${user?.id || "guest"}:${groupCode}`;
  const [initialChats] = useState(() => loadChats(storageKey));
  const [chats, setChats] = useState(initialChats.chats);
  const [activeChatId, setActiveChatId] = useState(initialChats.activeChatId);
  const [activeView, setActiveView] = useState("home");
  const [draft, setDraft] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [drawerName, setDrawerName] = useState(null);
  const [calendarDate, setCalendarDate] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || chats[0],
    [activeChatId, chats],
  );
  const sourceStatus = getSourceStatus(
    isDashboardLoading,
    dashboardError,
    dashboard?.navigator,
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ chats, activeChatId }));
    } catch {
      // В приватном режиме или при заполненном хранилище диалог остаётся в памяти.
      console.warn("Историю диалогов не удалось сохранить в браузере.");
    }
  }, [chats, activeChatId, storageKey]);

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      setIsDashboardLoading(true);
      setDashboardError("");

      try {
        const data = await getDashboard(groupCode);

        if (!isCancelled) {
          setDashboard(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setDashboardError(
            error.message || "Не удалось загрузить данные кампуса.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [groupCode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isAnswerLoading]);

  function updateActiveChat(updater) {
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === activeChatId ? updater(chat) : chat,
      ),
    );
  }

  function openView(viewName) {
    setActiveView(viewName);
    setIsMobileMenuOpen(false);
  }

  function openPanel(name, action = {}) {
    setIsMobileMenuOpen(false);
    if (name === "calendar") {
      setCalendarDate(action.startDate || null);
      openView("calendar");
      setDrawerName(null);
    } else setDrawerName(name);
  }

  function askFromPanel(question) {
    setDrawerName(null);
    sendMessage(question);
  }

  function startNewChat() {
    const chat = createChat();
    setChats((currentChats) => [chat, ...currentChats]);
    setActiveChatId(chat.id);
    setDraft("");
    setChatError("");
    openView("chat");
  }

  function selectChat(chatId) {
    setActiveChatId(chatId);
    setChatError("");
    openView("chat");
  }

  function deleteChat(chatId) {
    setChats((currentChats) => {
      const remainingChats = currentChats.filter((chat) => chat.id !== chatId);

      if (remainingChats.length === 0) {
        const replacementChat = createChat();
        setActiveChatId(replacementChat.id);
        return [replacementChat];
      }

      if (chatId === activeChatId) {
        setActiveChatId(remainingChats[0].id);
      }

      return remainingChats;
    });
  }

  async function sendMessage(messageText = draft) {
    const text = messageText.trim();

    if (!text || isAnswerLoading || !activeChat) {
      return;
    }

    const requestChatId = activeChat.id;
    const userMessage = createMessage("user", text);
    const nextMessages = [...activeChat.messages, userMessage];

    updateActiveChat((chat) => ({
      ...chat,
      title: chat.messages.length === 0 ? getChatTitle(text) : chat.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    }));

    setDraft("");
    setChatError("");
    setIsAnswerLoading(true);
    openView("chat");

    try {
      const apiMessages = nextMessages.map(({ role, content }) => ({
        role,
        content,
      }));
      const response = await askAssistant(apiMessages, { groupCode });
      const assistantMessage = createMessage("assistant", response.answer, {
        answerType: response.answerType,
        sources: response.sources,
        actions: response.actions,
      });

      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === requestChatId
            ? {
                ...chat,
                messages: [...nextMessages, assistantMessage],
                updatedAt: Date.now(),
              }
            : chat,
        ),
      );
    } catch (error) {
      setChatError(error.message || "Не удалось получить ответ.");
    } finally {
      setIsAnswerLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
        activeView={activeView}
        activeChatId={activeChatId}
        chats={chats}
        groupCode={groupCode}
        isMobileOpen={isMobileMenuOpen}
        sourceStatus={sourceStatus}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onDeleteChat={deleteChat}
        onNewChat={startNewChat}
        onOpenDrawer={openPanel}
        onSelectChat={selectChat}
        onViewChange={openView}
      />

      <main className="workspace">
        <TopBar
          groupCode={groupCode}
          user={user}
          onOpenAccount={onOpenAccount}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {activeView === "home" ? (
          <HomeDashboard
            dashboard={dashboard}
            error={dashboardError}
            groupCode={groupCode}
            isLoading={isDashboardLoading}
            onAsk={sendMessage}
            onOpenDrawer={openPanel}
          />
        ) : activeView === "calendar" ? (
          <WeekCalendar
            key={calendarDate || "current"}
            initialDate={calendarDate}
            groupCode={groupCode}
            onAsk={sendMessage}
            onOpenCampus={() => openPanel("campus")}
          />
        ) : (
          <section className="chat-view">
            <header className="chat-header">
              <div className="chat-heading">
                <span className="section-index">ПН</span>
                <div>
                  <small>ДИАЛОГ С НАВИГАТОРОМ</small>
                  <h1>{activeChat?.title || "Новый диалог"}</h1>
                </div>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={startNewChat}
              >
                <Icon name="plus" /> Новый диалог
              </button>
            </header>

            <div className="chat-scroll">
              {activeChat?.messages.length === 0 ? (
                <EmptyState onSuggestionClick={sendMessage} />
              ) : (
                <div className="messages">
                  {activeChat.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onAction={(action) => openPanel(action.type, action)}
                    />
                  ))}
                  {isAnswerLoading && <LoadingBubble />}
                  {chatError && <div className="error-banner">{chatError}</div>}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={() => sendMessage()}
              isLoading={isAnswerLoading}
            />
          </section>
        )}
      </main>

      <ContextDrawer
        dashboard={dashboard}
        name={drawerName}
        onAsk={askFromPanel}
        onOpenCalendar={() => openPanel("calendar")}
        onClose={() => setDrawerName(null)}
      />
    </div>
  );
}
