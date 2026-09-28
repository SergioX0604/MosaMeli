import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cerrando acceso",
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
