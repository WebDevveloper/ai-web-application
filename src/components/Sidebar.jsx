export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) {
  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-950 p-4 text-white md:flex">
      <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            AI chat
          </p>
          <h1 className="text-lg font-bold">Mistral Assistant</h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="mb-4 shrink-0 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-semibold transition hover:bg-blue-500"
      >
        + New chat
      </button>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;

          return (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 rounded-2xl p-2 transition ${
                isActive ? "bg-white/12" : "hover:bg-white/8"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-slate-100">
                  {chat.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {chat.messages.length === 0
                    ? "No messages yet"
                    : `${chat.messages.length} messages`}
                </p>
              </button>

              {chats.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteChat(chat.id)}
                  className="grid h-7 w-7 place-items-center rounded-full text-slate-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}