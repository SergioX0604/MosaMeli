import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/admin.html", destination: "/admin", permanent: false },
      { source: "/login.html", destination: "/login", permanent: false },
      { source: "/mi-perfil.html", destination: "/mi-perfil", permanent: false },
      { source: "/mis-pedidos.html", destination: "/mi-perfil", permanent: false },
      { source: "/privacidad.html", destination: "/privacidad", permanent: true },
      { source: "/terminos.html", destination: "/terminos", permanent: true },
      { source: "/seguimiento.html", destination: "/seguimiento", permanent: false },
      { source: "/splash.html", destination: "/", permanent: false },
      { source: "/reset-password.html", destination: "/reset-password", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
