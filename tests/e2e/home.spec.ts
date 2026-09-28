import { test, expect, type Page } from "@playwright/test";

const splashHeading = (page: Page) => page.getByRole("heading", { name: "MosaMeli" });
const catalogHeading = (page: Page) => page.getByRole("heading", { name: /productos/i }).first();

/** Entra al catálogo como lo haría una persona: carga real y salto de la intro. */
async function openCatalog(page: Page) {
  await page.goto("/");
  if (await splashHeading(page).isVisible().catch(() => false)) {
    await page.getByRole("link", { name: /Saltar intro/i }).click();
  }
  await expect(catalogHeading(page)).toBeVisible();
}

test("la portada muestra la tienda y el catálogo", async ({ page }) => {
  await openCatalog(page);
  await expect(page).toHaveTitle(/MosaMeli/);
  await expect(page.getByRole("link", { name: /Carrito/i })).toBeVisible();
});

test("el buscador tiene una acción accessible", async ({ page }) => {
  await openCatalog(page);
  const search = page.locator("#header-search");
  await expect(search).toBeVisible();
  await search.fill("hogar");
  await search.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: /producto/i })).toBeVisible();
});

test("el splash aparece al entrar al catálogo y se puede saltar", async ({ page }) => {
  await page.goto("/");
  await expect(splashHeading(page)).toBeVisible();
  await page.getByRole("link", { name: /Saltar intro/i }).click();
  await expect(catalogHeading(page)).toBeVisible();
});

test("recargar el catálogo vuelve a mostrar el splash", async ({ page }) => {
  await openCatalog(page);
  await page.reload();
  await expect(splashHeading(page)).toBeVisible();
});

test("ir al catálogo desde otra página no repite el splash", async ({ page }) => {
  await openCatalog(page);
  await page.getByRole("link", { name: /Carrito/i }).click();
  await expect(page.getByRole("heading", { name: "Tu carrito", exact: true })).toBeVisible();
  // navegación interna: el catálogo entra directo, sin intro
  await page.getByRole("link", { name: "MosaMeli, inicio" }).click();
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(catalogHeading(page)).toBeVisible();
  await expect(splashHeading(page)).toBeHidden();
});

test("la barra de categorías solo existe en el catálogo", async ({ page }) => {
  await openCatalog(page);
  await expect(page.locator(".category-nav")).toBeVisible();

  for (const ruta of ["/login", "/carrito", "/favoritos", "/mis-pedidos"]) {
    await page.goto(ruta);
    await expect(page.locator(".category-nav")).toHaveCount(0);
  }
});

test("filtrar por categoría no repite el splash", async ({ page }) => {
  await openCatalog(page);
  await page.getByRole("link", { name: /Hogar/i }).first().click();
  await expect(page).toHaveURL(/categoria=hogar/);
  await expect(splashHeading(page)).toBeHidden();
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
