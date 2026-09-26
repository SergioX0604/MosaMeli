import { test, expect } from "@playwright/test";

test("la portada muestra la tienda y el catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/MosaMeli/);
  await expect(page.getByRole("heading", { name: /Tu mundo en un click/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Carrito/i })).toBeVisible();
});

test("el buscador tiene una acción accessible", async ({ page }) => {
  await page.goto("/");
  const search = page.getByLabel("Buscar productos");
  await expect(search).toBeVisible();
  await search.fill("hogar");
  await expect(page.getByRole("status").filter({ hasText: /producto/i })).toBeVisible();
});
