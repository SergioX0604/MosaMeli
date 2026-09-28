const sharp = require("sharp");
const fs = require("fs");

const SRC_ICON = "public/img/android-chrome-192x192.png";
const SRC_LOCKUP = "public/img/logo-mosameli.png";

(async () => {
  // 1. Icono cuadrado optimizado para header, footer, splash y login.
  await sharp(SRC_ICON)
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 })
    .toFile("public/img/logo-icon.png");

  // 2. Imagen social 1200x630 con el lockup completo sobre fondo claro.
  const bg = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#fbf8ff" },
  }).png().toBuffer();

  await sharp(bg)
    .composite([
      {
        input: await sharp(SRC_LOCKUP)
          .resize(1080, 540, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer(),
        gravity: "center",
      },
    ])
    .flatten({ background: "#fbf8ff" })
    .jpeg({ quality: 86, progressive: true, chromaSubsampling: "4:4:4" })
    .toFile("public/img/logo-og.jpg");

  for (const f of ["logo-icon.png", "logo-og.jpg"]) {
    const p = `public/img/${f}`;
    const m = await sharp(p).metadata();
    console.log(f.padEnd(18), `${m.width}x${m.height}`.padEnd(10), m.format.padEnd(5), (fs.statSync(p).size / 1024).toFixed(1) + "KB");
  }
})();
