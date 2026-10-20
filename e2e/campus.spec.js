import { test, expect } from "@playwright/test";

test("профиль, календарь и помощь работают на desktop и mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Как вас называть").fill("Тестовый студент");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`student-${Date.now()}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("separate-test-password");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Календарь", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  await expect(
    page.getByText("Дискретная математика", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Помощь", exact: true }).click();
  await page
    .getByRole("button", { name: /Не работает личный кабинет/ })
    .click();
  await expect(page.locator(".user-bubble")).toContainText("Куда обратиться");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Кампус", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("button", { name: "Календарь", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Календарь", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
