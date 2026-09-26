"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => createSupabaseBrowserClient().auth.getSession())
      .then(({ data }) => { if (active) setReady(Boolean(data.session)); })
      .catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 12 caracteres." });
      return;
    }
    if (password !== confirmation) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Contraseña actualizada. Redirigiendo…" });
    window.setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="page-shell container-shell">
      <div className="surface mx-auto max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-black">Nueva contraseña</h1>
        {!ready ? <p className="mt-4 alert alert-error">El enlace es inválido o expiró. Solicita uno nuevo.</p> : null}
        {message ? <p className={`alert mt-4 ${message.type === "error" ? "alert-error" : "alert-success"}`} role="status">{message.text}</p> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div><label className="form-label" htmlFor="new-password">Nueva contraseña</label><input id="new-password" className="form-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <div><label className="form-label" htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" className="form-input" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
          <button className="btn btn-primary w-full" type="submit" disabled={!ready || busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      </div>
    </div>
  );
}
