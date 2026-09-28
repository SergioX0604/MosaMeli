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

test("un ?code= de OAuth inválido devuelve al login con aviso", async ({ page }) => {
  // tanto en /auth/callback como si Supabase cae al Site URL con ?code=...
  await page.goto("/auth/callback?code=codigo-invalido");
  await expect(page).toHaveURL(/\/login\?error=oauth/);
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/No pudimos completar el acceso con Google/i);

  await page.goto("/?code=codigo-invalido");
  await expect(page).toHaveURL(/\/login\?error=oauth/);
});

test("el callback de Google muestra el estado de cierre", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: /Cerrando tu acceso/i })).toBeVisible();
});

test("el code de OAuth se procesa en el navegador, no en el servidor", async ({ page }) => {
  // Con un code sin verifier, @supabase/auth-js falla antes de llamar a la API.
  // Si el intercambio se hiciera en un Route Handler, el servidor lo intentaría
  // (y sin cookies del flujo no encontraría el verifier).
  let serverAttempts = 0;
  await page.route("**/auth/v1/token**", async (route) => {
    serverAttempts += 1;
    await route.continue();
  });

  await page.goto("/auth/callback?code=codigo-invalido");
  await expect(page).toHaveURL(/\/login\?error=oauth/);
  expect(serverAttempts).toBe(0);
});

test("el buscador no aparece fuera del catálogo", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#header-search")).toHaveCount(0);
  await page.goto("/carrito");
  await expect(page.locator("#header-search")).toHaveCount(0);
});
