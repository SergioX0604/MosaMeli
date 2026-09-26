"use client";

import { useState, useTransition } from "react";
import { updateDeliveryCostAction } from "@/app/admin/actions";

export function DeliveryCostEditor({ orderId, initial }: { orderId: number; initial: number }) {
  const [value, setValue] = useState(String(initial ?? 0));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateDeliveryCostAction(orderId, Number(value));
      setMessage(result.ok ? "Costo guardado" : result.message ?? "No se pudo guardar");
    });
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><label htmlFor={`cost-${orderId}`}>Costo real</label><input id={`cost-${orderId}`} className="form-input max-w-32" type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} /><button type="button" className="btn btn-secondary min-h-9 px-3" onClick={save} disabled={pending}>Guardar</button>{message ? <span className="text-xs text-[var(--muted)]" role="status">{message}</span> : null}</div>;
}
