import { useEffect, useRef, useState } from "react";
import { askAssistant } from "./api/chatApi";
import ChatComposer from "./components/ChatComposer";
import ChatMessage from "./components/ChatMessage";
import EmptyState from "./components/EmptyState";
import LoadingBubble from "./components/LoadingBubble";
import Sidebar from "./components/Sidebar";

const STORAGE_KEY = "ai-web-application-chats";

function createChat() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function createMessage(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

function getChatTitle(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length <= 34) {
    return cleanText || "New chat";
  }

  return `${cleanText.slice(0, 34)}...`;
}

function loadInitialChats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const firstChat = createChat();
      return {
        chats: [firstChat],
        activeChatId: firstChat.id,
      };
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed.chats) || parsed.chats.length === 0) {
      throw new Error("Invalid chat history");
    }

    return {
      chats: parsed.chats,
      activeChatId: parsed.activeChatId || parsed.chats[0].id,
    };
  } catch {
    const firstChat = createChat();

    return {
      chats: [firstChat],
      activeChatId: firstChat.id,
    };
  }
}

function App() {
  const [initialState] = useState(() => loadInitialChats ());

  const [chats, setChats] = useState(initialState.chats);
  const [activeChatId, setActiveChatId] = useState(initialState.activeChatId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const voiceBaseTextRef = useRef("");
  const draftRef = useRef("");
  const chatEndRef = useRef(null);

  const isVoiceSupported =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) || chats[0];

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chats,
        activeChatId,
      })
    );
  }, [chats, activeChatId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isLoading]);

  function updateActiveChat(updater) {
    setChats((currentChats) =>
      currentChats.map((chat) => {
        if (chat.id !== activeChatId) {
          return chat;
        }

        return updater(chat);
      })
    );
  }

  async function sendMessage() {
    const text = draft.trim();

    if (!text || isLoading || !activeChat) {
      return;
    }

    const userMessage = createMessage("user", text);
    const nextMessages = [...activeChat.messages, userMessage];

    updateActiveChat((chat) => ({
      ...chat,
      title: chat.messages.length === 0 ? getChatTitle(text) : chat.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    }));

    setDraft("");
    setError("");
    setIsLoading(true);

    try {
      const apiMessages = nextMessages.map(({ role, content }) => ({
        role,
        content,
      }));

      const answer = await askAssistant(apiMessages);
      const assistantMessage = createMessage("assistant", answer);

      setChats((currentChats) =>
        currentChats.map((chat) => {
          if (chat.id !== activeChatId) {
            return chat;
          }

          return {
            ...chat,
            messages: [...nextMessages, assistantMessage],
            updatedAt: Date.now(),
          };
        })
      );
    } catch (err) {
      setError(err.message || "Failed to get a response.");
    } finally {
      setIsLoading(false);
    }
  }

  function createRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      const combinedText = [
        voiceBaseTextRef.current.trim(),
        finalTranscript.trim(),
        interimTranscript.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      setDraft(combinedText);
    };

    recognition.onerror = () => {
      setError("Voice recognition failed. Please try again.");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        voiceBaseTextRef.current = draftRef.current;

        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        }, 250);

        return;
      }

      setIsListening(false);
    };

    return recognition;
  }

  function toggleVoiceInput() {
    setError("");

    if (!isVoiceSupported) {
      setError("Voice input is not available in this browser.");
      return;
    }

    if (isListening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = createRecognition();

    if (!recognition) {
      setError("Voice input is not available in this browser.");
      return;
    }

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    voiceBaseTextRef.current = draftRef.current;

    try {
      recognition.start();
    } catch {
      setError("Could not start voice recognition.");
      setIsListening(false);
      shouldKeepListeningRef.current = false;
    }
  }

  function startNewChat() {
    const chat = createChat();

    setChats((currentChats) => [chat, ...currentChats]);
    setActiveChatId(chat.id);
    setDraft("");
    setError("");
  }

  function deleteChat(chatId) {
    setChats((currentChats) => {
      const nextChats = currentChats.filter((chat) => chat.id !== chatId);

      if (nextChats.length === 0) {
        const chat = createChat();
        setActiveChatId(chat.id);
        return [chat];
      }

      if (chatId === activeChatId) {
        setActiveChatId(nextChats[0].id);
      }

      return nextChats;
    });
  }

  function selectChat(chatId) {
    setActiveChatId(chatId);
    setDraft("");
    setError("");
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-slate-950">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={startNewChat}
        onDeleteChat={deleteChat}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
        <header className="mb-4 flex shrink-0 items-center justify-between rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/70 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-blue-600">AI Assistant</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {activeChat?.title || "New chat"}
            </h1>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
          >
            New chat
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-white/70 bg-white/65 p-3 shadow-2xl shadow-slate-200/80 backdrop-blur sm:p-5">
          <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-2 sm:px-3">
            {activeChat?.messages.length === 0 ? (
              <EmptyState onSuggestionClick={setDraft} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {activeChat.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {isLoading && <LoadingBubble />}

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-3xl shrink-0">
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={sendMessage}
              onVoiceToggle={toggleVoiceInput}
              isLoading={isLoading}
              isListening={isListening}
              isVoiceSupported={isVoiceSupported}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
