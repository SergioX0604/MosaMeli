import { test, expect, type Page } from "@playwright/test";

const splashHeading = (page: Page) =>
  page.getByRole("heading", { name: "MosaMeli" });
const catalogHeading = (page: Page) =>
  page.getByRole("heading", { name: /productos/i }).first();

/** Entra al catálogo como lo haría una persona: carga real y salto de la intro. */
async function openCatalog(page: Page) {
  await page.goto("/");
  if (
    await splashHeading(page)
      .isVisible()
      .catch(() => false)
  ) {
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
  await expect(
    page.getByRole("status").filter({ hasText: /producto/i }),
  ).toBeVisible();
});

test("el splash aparece al entrar al catálogo y se puede saltar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(splashHeading(page)).toBeVisible();
  await page.getByRole("link", { name: /Saltar intro/i }).click();
  await expect(catalogHeading(page)).toBeVisible();
});

test("recargar el catálogo no vuelve a mostrar el splash durante 30 días", async ({
  page,
}) => {
  await openCatalog(page);
  await page.reload();
  await expect(catalogHeading(page)).toBeVisible();
  await expect(splashHeading(page)).toBeHidden();
});

test("el splash conserva los filtros del enlace de entrada", async ({
  page,
}) => {
  await page.goto("/?categoria=hogar#catalogo");
  await expect(splashHeading(page)).toBeVisible();
  await page.getByRole("link", { name: /Saltar intro/i }).click();
  await expect(page).toHaveURL(/categoria=hogar/);
});

test("ir al catálogo desde otra página no repite el splash", async ({
  page,
}) => {
  await openCatalog(page);
  await page.getByRole("link", { name: /Carrito/i }).click();
  await expect(
    page.getByRole("heading", { name: "Tu carrito", exact: true }),
  ).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: /productos|Hogar/i }).first(),
  ).toBeVisible();
});

test("un ?code= de OAuth inválido devuelve al login con aviso", async ({
  page,
}) => {
  // tanto en /auth/callback como si Supabase cae al Site URL con ?code=...
  await page.goto("/auth/callback?code=codigo-invalido");
  await expect(page).toHaveURL(/\/login\?error=oauth/);
  await expect(
    page.getByRole("heading", { name: "Inicia sesión" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    /No pudimos completar el acceso con Google/i,
  );

  await page.goto("/?code=codigo-invalido");
  await expect(page).toHaveURL(/\/login\?error=oauth/);
});

test("el callback de Google muestra el estado de cierre", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(
    page.getByRole("heading", { name: /Cerrando tu acceso/i }),
  ).toBeVisible();
});

test("el code de OAuth se procesa en el navegador, no en el servidor", async ({
  page,
}) => {
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

test("cada enlace informativo del pie apunta a su propia página", async ({
  page,
}) => {
  await page.goto("/carrito");
  const footer = page.getByRole("contentinfo");
  const destinos: Record<string, string> = {
    "Nuestra tienda": "/nosotros",
    "Regalo sorpresa": "/regalo-sorpresa",
    "Por qué elegirnos": "/por-que-elegirnos",
    "Zonas de delivery": "/zonas-delivery",
    "Cómo comprar": "/como-comprar",
    "Rastrear mi pedido": "/rastrear-pedido",
    "Envíos por Olva": "/envios-olva",
    "Métodos de pago": "/metodos-pago",
    "Tiempo de entrega": "/tiempo-entrega",
    "Preguntas frecuentes": "/faq",
  };

  for (const [nombre, href] of Object.entries(destinos)) {
    await expect(
      footer.getByRole("link", { name: nombre, exact: true }),
    ).toHaveAttribute("href", href);
  }
});

test("el correo del footer se copia y la ubicación abre Google Maps", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-write"]);
  await page.goto("/carrito");
  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "mosamelicorp@gmail.com" }),
  ).toHaveCount(0);
  await footer.getByRole("button", { name: "mosamelicorp@gmail.com" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Correo copiado: mosamelicorp@gmail.com",
  );
  await expect(
    footer.getByRole("link", { name: /Chaclacayo, Lima/ }),
  ).toHaveAttribute("href", /google\.com\/maps\/search/);
});

test("las preguntas frecuentes explican cómo conseguir el código y las zonas", async ({
  page,
}) => {
  await page.goto("/preguntas-frecuentes");
  await expect(
    page.getByRole("heading", { name: "Preguntas frecuentes" }),
  ).toBeVisible();

  const zonas = page.locator("details", {
    hasText: "delivery y cuánto cuesta",
  });
  await expect(zonas).toBeVisible();
  // Las zonas y el umbral del regalo vienen de lib/delivery.ts, no de texto fijo.
  await expect(zonas).toContainText("Chaclacayo Centro");
  await expect(zonas).toContainText("Zona 4");

  const gift = page.locator("details", { hasText: "regalo sorpresa" });
  await expect(gift).toContainText("150");
});

test("el catálogo móvil usa navegación, dos columnas y filtros adaptados", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    {
      name: "mosameli_splash_seen",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");

  await expect(page.locator(".mobile-menu-trigger")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(page.locator(".catalog-mobile-hero-content")).toBeVisible();
  await expect(page.locator(".mobile-filter-button")).toBeVisible();

  const cards = page.locator(".product-card");
  await expect(cards.first()).toBeVisible();
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(first?.y).toBe(second?.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.locator(".mobile-filter-button").click();
  await expect(page.locator(".filters-panel")).toHaveClass(/mobile-open/);
  await expect(page.locator(".mobile-filter-apply")).toBeVisible();
});

test("la vista rápida permite zoom y ampliación de las imágenes", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "mosameli_splash_seen",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");
  await page.locator(".product-media").first().click();

  const dialog = page.getByRole("dialog", { name: /Rodillera Deportiva/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Añadir al carrito/i })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Comprar ahora/i })).toBeVisible();
  await expect(dialog.getByText("Cuéntanos qué te pareció")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Escribir mi reseña/i })).toBeVisible();
  const zoom = dialog.locator(".product-zoom-stage");
  await zoom.hover({ position: { x: 220, y: 180 } });
  await expect(zoom).toHaveClass(/is-zoomed/);

  await zoom.click();
  await expect(
    page.getByRole("dialog", { name: /Imagen ampliada/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acercar" }).click();
  await expect(
    page.getByRole("button", { name: "Restablecer zoom" }),
  ).toContainText("125%");
  await page.getByRole("button", { name: "Cerrar imagen ampliada" }).click();
  await expect(dialog).toBeVisible();
});

test("el catálogo muestra ocho productos y conserva la densidad elegida", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "mosameli_splash_seen",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");

  await expect(page.locator(".product-card")).toHaveCount(8);
  const firstCard = page.locator(".product-card").first();
  await expect(firstCard.getByRole("button", { name: /Compra rápida de/i })).toBeVisible();
  await expect(firstCard.getByRole("button", { name: /Añadir .* al carrito/i })).toBeVisible();
  await page.getByRole("button", { name: "Vista amplia" }).click();
  await expect(page.locator(".product-grid")).toHaveClass(/density-wide/);
  await page.reload();
  await expect(page.locator(".product-grid")).toHaveClass(/density-wide/);
});

test("el modo oscuro se aplica y persiste entre recargas", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "mosameli_splash_seen",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("mosameli-theme"))
      window.localStorage.setItem("mosameli-theme", "light");
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const themeButton = page.getByRole("button", { name: "Activar modo claro" });
  await expect(themeButton).toBeVisible();
  await expect(themeButton).toContainText("DARK");
  await expect(page.locator(".catalog-hero h1")).toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(page.locator(".product-card .product-name").first()).toHaveCSS("color", "rgb(248, 250, 252)");
});

test("los videos del producto ofrecen controles de reproducción y velocidad", async ({
  page,
}) => {
  await page.goto("/producto/14");
  await page.getByRole("button", { name: /Ver video de/i }).click();

  const player = page.locator(".catalog-video-player");
  await expect(player).toBeVisible();
  await expect(
    player.getByRole("button", { name: "Reproducir", exact: true }),
  ).toBeVisible();
  await expect(
    player.getByRole("slider", { name: "Progreso del video" }),
  ).toBeVisible();

  await player.getByRole("button", { name: /Velocidad 1x/i }).click();
  await expect(
    player.getByRole("menu", { name: "Velocidad de reproducción" }),
  ).toBeVisible();
  await player.getByRole("menuitem", { name: "1.5x" }).click();
  await expect(
    player.getByRole("button", { name: /Velocidad 1.5x/i }),
  ).toBeVisible();
  await expect(
    player.getByRole("button", { name: "Ver video en pantalla completa" }),
  ).toBeVisible();
});
