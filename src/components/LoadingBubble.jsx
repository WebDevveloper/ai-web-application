export default function LoadingBubble() {
  return (
    <div className="message assistant-message" aria-label="Ассистент готовит ответ">
      <div className="assistant-avatar" aria-hidden="true">AI</div>
      <div className="typing-indicator"><i /><i /><i /></div>
    </div>
  );
}
