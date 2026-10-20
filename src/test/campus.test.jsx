import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import CampusMap from "../components/CampusMap";
import AccountDialog from "../components/AccountDialog";
import { getDashboard, getGroups, getScheduleWeek } from "../api/campusApi";
import { askAssistant } from "../api/chatApi";
import { apiRequest } from "../api/http";
import { mondayOf, shiftDate } from "../utils/calendarDates";

vi.mock("../api/campusApi", () => ({
  getDashboard: vi.fn(),
  getGroups: vi.fn(),
  getScheduleWeek: vi.fn(),
  searchDirectory: vi.fn(),
  sendFeedback: vi.fn(),
}));
vi.mock("../api/chatApi", () => ({ askAssistant: vi.fn() }));
vi.mock("../api/http", () => ({ apiRequest: vi.fn() }));
beforeEach(() => {
  apiRequest.mockResolvedValue({ user: null });
  getGroups.mockResolvedValue({
    groups: [{ code: "261-321" }, { code: "261-322" }],
  });
  getDashboard.mockResolvedValue({
    lessons: [],
    deadlines: [],
    locations: [],
    navigator: { enabled: true },
  });
  getScheduleWeek.mockImplementation(async (groupCode, startDate) => ({
    groupCode,
    startDate,
    deadlines: [],
    days: Array.from({ length: 7 }, (_, day) => ({
      date: shiftDate(startDate, day),
      lessons:
        day === 0
          ? [
              {
                id: "lesson",
                subject: "Дискретная математика",
                startTime: null,
                room: "А101",
              },
            ]
          : [],
    })),
  }));
  askAssistant.mockResolvedValue({
    answer: "Контакты из источника",
    sources: [],
    actions: [],
  });
});

test("помощь отправляет вопрос в диалог с выбранной группой", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Помощь", exact: true }),
  );
  await user.click(
    screen.getByRole("button", { name: /Не работает личный кабинет/ }),
  );
  await screen.findByText("Контакты из источника");
  expect(askAssistant).toHaveBeenCalledWith(
    [
      {
        role: "user",
        content: "Куда обратиться, если не работает личный кабинет?",
      },
    ],
    { groupCode: "261-321" },
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("календарь показывает семь дней, переключает неделю и передаёт вопрос о дне", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Календарь", exact: true }),
  );
  await screen.findByText("Дискретная математика");
  expect(document.querySelectorAll(".calendar-day").length).toBe(7);
  const firstStart = getScheduleWeek.mock.calls.at(-1)[1];
  await user.click(screen.getByRole("button", { name: "Следующая неделя" }));
  await waitFor(() =>
    expect(getScheduleWeek).toHaveBeenLastCalledWith(
      "261-321",
      shiftDate(firstStart, 7),
    ),
  );
  await screen.findByText("Дискретная математика");
  await user.click(
    screen.getAllByRole("button", { name: "Спросить о дне" })[0],
  );
  await screen.findByText("Контакты из источника");
  expect(askAssistant.mock.calls.at(-1)[0][0].content).toBe(
    `Расписание на ${shiftDate(firstStart, 7)}`,
  );
});

test("группа гостя сохраняется и меняет контекст запросов", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", {
      name: /Учебная группа 261-321, изменить/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Без аккаунта" }));
  const input = screen.getByRole("combobox", { name: /Учебная группа/ });
  await user.clear(input);
  await user.type(input, "261-322");
  await user.click(screen.getByRole("button", { name: "Сохранить группу" }));
  await waitFor(() => expect(getDashboard).toHaveBeenLastCalledWith("261-322"));
  expect(localStorage.getItem("campus-guest-group")).toBe("261-322");
});

test("смена пользователя не показывает историю другого аккаунта", async () => {
  localStorage.setItem(
    "polytech-navigator-chats:other-user:261-321",
    JSON.stringify({
      chats: [{ id: "private", title: "Чужой диалог", messages: [] }],
      activeChatId: "private",
    }),
  );
  apiRequest.mockResolvedValue({
    user: { id: "current-user", displayName: "Студент", groupCode: "261-322" },
  });
  render(<App />);
  await screen.findByRole("button", {
    name: /Учебная группа 261-322, изменить/,
  });
  expect(screen.queryByText("Чужой диалог")).toBeNull();
  expect(getDashboard).toHaveBeenCalledWith("261-322");
});

test("ошибка регистрации видна, неподключённая группа не отправляется", async () => {
  const user = userEvent.setup();
  const onAccountChange = vi.fn();
  render(
    <AccountDialog
      user={null}
      groupCode="261-321"
      groups={[{ code: "261-321" }]}
      onAccountChange={onAccountChange}
      onClose={vi.fn()}
      onGuestGroupChange={vi.fn()}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Регистрация" }));
  await user.type(screen.getByLabelText("Как вас называть"), "Артём");
  await user.type(screen.getByLabelText("Email"), "student@example.com");
  await user.type(screen.getByLabelText("Пароль"), "separate-password");
  apiRequest.mockRejectedValueOnce(new Error("Вход пока не настроен"));
  await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Вход пока не настроен",
  );
  expect(onAccountChange).not.toHaveBeenCalled();
});

test("карта не загружается и не запрашивает положение до нажатия; отказ GPS объясняется", async () => {
  const locate = vi.fn((_success, failure) => failure({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: locate },
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  const user = userEvent.setup();
  render(<CampusMap address="Большая Семёновская, 38" name="Главный корпус" />);
  expect(document.querySelector("iframe")).toBeNull();
  expect(locate).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Показать карту" }));
  expect(document.querySelector("iframe")?.title).toBe(
    "Яндекс Карты: Главный корпус",
  );
  await user.click(screen.getByRole("button", { name: "Маршрут от меня" }));
  expect(locate).toHaveBeenCalledTimes(1);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Не удалось определить местоположение",
  );
});

test("календарные вычисления переходят через воскресенье и границу года", () => {
  expect(mondayOf("2026-10-25")).toBe("2026-10-19");
  expect(mondayOf("2026-10-19")).toBe("2026-10-19");
  expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
});

test("действие ответа открывает неделю указанной даты, а не сегодняшнюю", async () => {
  askAssistant.mockResolvedValueOnce({
    answer: "Расписание другой недели",
    sources: [],
    actions: [
      { type: "calendar", label: "Открыть календарь", startDate: "2026-11-09" },
    ],
  });
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Диалог", exact: true }),
  );
  await user.type(
    screen.getByPlaceholderText("Напишите вопрос о кампусе…"),
    "Расписание на неделю с 2026-11-09",
  );
  await user.click(screen.getByRole("button", { name: "Отправить сообщение" }));
  await user.click(
    await screen.findByRole("button", { name: "Открыть календарь" }),
  );
  await waitFor(() =>
    expect(getScheduleWeek).toHaveBeenLastCalledWith("261-321", "2026-11-09"),
  );
});
