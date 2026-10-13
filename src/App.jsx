import { useEffect, useMemo, useRef, useState } from "react";
import { askAssistant } from "./api/chatApi";
import { getDashboard } from "./api/campusApi";
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

function loadChats() {
  try {
    const savedValue = localStorage.getItem(CHAT_STORAGE_KEY);

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

export default function App() {
  const [initialChats] = useState(loadChats);
  const [chats, setChats] = useState(initialChats.chats);
  const [activeChatId, setActiveChatId] = useState(initialChats.activeChatId);
  const [activeView, setActiveView] = useState("home");
  const [draft, setDraft] = useState("");
  const [groupCode] = useState(DEFAULT_GROUP_CODE);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [drawerName, setDrawerName] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || chats[0],
    [activeChatId, chats],
  );
  const sourceStatus = isDashboardLoading
    ? {
        state: "loading",
        title: "Проверяем источники",
        details: "загружаем данные кампуса",
      }
    : dashboardError
      ? {
          state: "error",
          title: "Источники недоступны",
          details: "проверьте подключение сервера",
        }
      : {
          state: "ready",
          title: "Источники подключены",
          details: "актуальность указана в ответах",
        };

  useEffect(() => {
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ chats, activeChatId }),
    );
  }, [chats, activeChatId]);

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
        activeView={activeView}
        activeChatId={activeChatId}
        chats={chats}
        groupCode={groupCode}
        isMobileOpen={isMobileMenuOpen}
        sourceStatus={sourceStatus}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onDeleteChat={deleteChat}
        onNewChat={startNewChat}
        onOpenDrawer={setDrawerName}
        onSelectChat={selectChat}
        onViewChange={openView}
      />

      <main className="workspace">
        <TopBar
          groupCode={groupCode}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {activeView === "home" ? (
          <HomeDashboard
            dashboard={dashboard}
            error={dashboardError}
            groupCode={groupCode}
            isLoading={isDashboardLoading}
            onAsk={sendMessage}
            onOpenDrawer={setDrawerName}
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
              <button className="text-button" type="button" onClick={startNewChat}>
                ＋ Новый диалог
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
                      onAction={(action) => setDrawerName(action.type)}
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
        onClose={() => setDrawerName(null)}
      />
    </div>
  );
}
