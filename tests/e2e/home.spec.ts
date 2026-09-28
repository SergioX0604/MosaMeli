import { test, expect, type Page } from "@playwright/test";

const SPLASH_COOKIE = "mosameli_splash_v2";

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: SPLASH_COOKIE, value: "1", url: "http://127.0.0.1:3000" },
  ]);
});

// El catálogo borra la marca del splash al mostrarse, así que esperamos a que
// la cookie desaparezca antes de simular una nueva entrada.
async function expectSplashCleared(page: Page) {
  await expect
    .poll(async () => (await page.context().cookies("http://127.0.0.1:3000")).some((cookie) => cookie.name === SPLASH_COOKIE))
    .toBe(false);
}

test("la portada muestra la tienda y el catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/MosaMeli/);
  await expect(page.getByRole("heading", { name: "Todos los productos" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Carrito/i })).toBeVisible();
});

test("el buscador tiene una acción accessible", async ({ page }) => {
  await page.goto("/");
  const search = page.locator("#header-search");
  await expect(search).toBeVisible();
  await search.fill("hogar");
  await search.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: /producto/i })).toBeVisible();
});

test("el splash aparece en cada entrada al catálogo y se puede saltar", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MosaMeli" })).toBeVisible();
  await page.getByRole("button", { name: /Saltar intro/i }).click();
  await expect(page.getByRole("heading", { name: /productos/i }).first()).toBeVisible();
});

test("recargar el catálogo vuelve a mostrar el splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /productos/i }).first()).toBeVisible();
  await expectSplashCleared(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "MosaMeli" })).toBeVisible();
});

test("volver desde otra página muestra el splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /productos/i }).first()).toBeVisible();
  await expectSplashCleared(page);
  await page.getByRole("link", { name: /Carrito/i }).click();
  await expect(page.getByRole("heading", { name: "Tu carrito", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MosaMeli" })).toBeVisible();
});

test("filtrar por categoría no repite el splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /productos/i })).toBeVisible();
  await page.getByRole("link", { name: /Hogar/i }).first().click();
  await expect(page).toHaveURL(/categoria=hogar/);
  await expect(page.getByRole("heading", { name: "MosaMeli" })).toBeHidden();
  await expect(page.getByRole("heading", { name: /productos|Hogar/i }).first()).toBeVisible();
});
