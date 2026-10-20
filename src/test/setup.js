import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom не реализует модальные окна и прокрутку; поведение браузера проверяет e2e.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
