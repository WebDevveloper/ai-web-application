import { useEffect, useRef } from "react";
import Icon from "./Icon";

export default function Modal({ title, className = "", onClose, children }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="icon-button modal-close"
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      {children}
    </dialog>
  );
}
