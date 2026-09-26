"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, signUpSchema } from "@/lib/validation";

type AuthFormProps = { nextPath: string };

export function AuthForm({ nextPath }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function safeNext() {
    return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa tus datos");
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw new Error("Correo o contraseña incorrectos");
        router.push(safeNext());
        router.refresh();
        return;
      }
      if (mode === "register") {
        const parsed = signUpSchema.safeParse({ username, email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa tus datos");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { data: { username: parsed.data.username } },
        });
        if (error) throw new Error(error.message);
        if (data.session) {
          router.push(safeNext());
          router.refresh();
        } else {
          setMessage({ type: "success", text: "Cuenta creada. Revisa tu correo para confirmar tu cuenta." });
        }
        return;
      }
      const parsed = loginSchema.shape.email.safeParse(email);
      if (!parsed.success) throw new Error("Ingresa un correo válido");
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setMessage({ type: "success", text: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No pudimos completar la operación" });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}` },
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No pudimos iniciar con Google" });
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Inicia sesión" : mode === "register" ? "Crea tu cuenta" : "Recupera tu acceso";

  return (
    <div className="surface mx-auto max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Accede a tus pedidos, reseñas y datos de entrega.</p>

      {message ? <div className={`alert mt-4 ${message.type === "error" ? "alert-error" : "alert-success"}`} role="status">{message.text}</div> : null}

      {mode !== "recover" ? (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div>
              <label className="form-label" htmlFor="auth-username">Nombre de usuario</label>
              <input id="auth-username" className="form-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="name" required />
            </div>
          ) : null}
          <div>
            <label className="form-label" htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <div>
            <label className="form-label" htmlFor="auth-password">Contraseña</label>
            <input id="auth-password" className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            {mode === "register" ? <p className="mt-1 text-xs text-[var(--muted)]">Mínimo 12 caracteres.</p> : null}
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? "Procesando…" : "Continuar"}</button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="recover-email">Correo electrónico</label>
            <input id="recover-email" className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar enlace"}</button>
        </form>
      )}

      {mode === "login" ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--border)]" />o<span className="h-px flex-1 bg-[var(--border)]" /></div>
          <button type="button" className="btn btn-secondary w-full" onClick={handleGoogle} disabled={busy}>Continuar con Google</button>
          <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="font-bold text-[var(--primary)] hover:underline" onClick={() => { setMode("register"); setMessage(null); }}>Crear cuenta</button>
            <button type="button" className="font-bold text-[var(--muted)] hover:underline" onClick={() => { setMode("recover"); setMessage(null); }}>Olvidé mi contraseña</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn-quiet mt-5 w-full text-sm" onClick={() => { setMode("login"); setMessage(null); }}>Volver a iniciar sesión</button>
      )}
    </div>
  );
}
