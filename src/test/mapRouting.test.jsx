import { expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampusMap from "../components/CampusMap";
import {
  loadYandexMaps,
  mapDestination,
  yandexRouteUrl,
} from "../maps/yandexMaps";

vi.mock("../maps/yandexMaps", async (importOriginal) => ({
  ...(await importOriginal()),
  loadYandexMaps: vi.fn(),
}));

test("встроенный маршрутизатор получает адрес корпуса, затем GPS по нажатию", async () => {
  const setState = vi.fn();
  const setOptions = vi.fn();
  const destroy = vi.fn();
  const get = vi.fn(() => ({
    routePanel: { state: { set: setState }, options: { set: setOptions } },
  }));
  loadYandexMaps.mockResolvedValue({
    Map: class {
      controls = { get };
      destroy = destroy;
    },
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  const locate = vi.fn((success) =>
    success({ coords: { latitude: 55.7, longitude: 37.6 } }),
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: locate },
  });
  const user = userEvent.setup();
  const view = render(
    <CampusMap
      address="Большая Семёновская, 38"
      name="Главный корпус"
      apiKey="test-key"
    />,
  );
  expect(loadYandexMaps).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Показать карту" }));
  await waitFor(() =>
    expect(setState).toHaveBeenCalledWith({
      type: "masstransit",
      fromEnabled: true,
      toEnabled: false,
      to: "Москва, Большая Семёновская, 38",
    }),
  );
  expect(locate).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Маршрут от меня" }));
  expect(setState).toHaveBeenCalledWith("from", [55.7, 37.6]);
  const route = new URL(
    screen.getByRole("link", { name: /Открыть маршрут/ }).href,
  );
  expect(route.searchParams.get("rtext")).toContain("55.7,37.6~Москва");
  view.unmount();
  expect(destroy).toHaveBeenCalledOnce();
});

test("ошибка загрузки карты оставляет доступный переход к маршруту", async () => {
  loadYandexMaps.mockRejectedValue(new Error("Карта недоступна"));
  const user = userEvent.setup();
  render(
    <CampusMap
      address="Москва, Автозаводская, 16"
      name="Автозаводская"
      apiKey="test-key"
    />,
  );
  await user.click(screen.getByRole("button", { name: "Показать карту" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Карта недоступна",
  );
  expect(screen.getByRole("link", { name: /Открыть маршрут/ }).href).toContain(
    "https://yandex.ru/maps/",
  );
});

test("ссылка кодирует адрес как данные и не дублирует город", () => {
  expect(mapDestination("Москва, Корчагина, 22")).toBe("Москва, Корчагина, 22");
  const url = new URL(yandexRouteUrl("Семёновская & проспект, 38"));
  expect(url.origin).toBe("https://yandex.ru");
  expect(url.searchParams.get("rtext")).toBe(
    "~Москва, Семёновская & проспект, 38",
  );
});
