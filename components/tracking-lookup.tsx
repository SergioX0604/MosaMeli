"use client";

import { useState, useTransition } from "react";
import { getTrackingAction } from "@/app/seguimiento/actions";
import { TrackingView } from "@/components/tracking-view";

export function TrackingLookup({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<React.ComponentProps<typeof TrackingView>["order"] | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await getTrackingAction(token);
      if (!response.ok) { setResult(null); setError(response.message); return; }
      setResult(response.data);
    });
  }

  return (
    <div className="space-y-6">
      <form className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex-1">
          <label className="form-label" htmlFor="tracking-token">Código de seguimiento</label>
          <input
            id="tracking-token"
            className="form-input"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="MOSA-20260929-ABC123 o token del enlace seguro"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Puedes pegar el código MOSA que recibiste. Para proteger tus datos, debes iniciar sesión al usar el código escrito.</p>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Buscando…" : "Consultar"}</button>
      </form>
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {result ? <TrackingView order={result} /> : null}
    </div>
  );
}
