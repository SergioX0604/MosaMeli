"use client";

import { useCallback, useState, useTransition } from "react";
import { deleteAddressAction, saveAddressAction } from "@/app/profile/actions";
import { DeliveryMap } from "@/components/delivery-map";
import { DELIVERY_ORIGIN } from "@/lib/delivery";

type SavedAddress = { id?: string; lat: number; lng: number; texto: string };

export function AddressManager({ initial = [] }: { initial?: SavedAddress[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [text, setText] = useState("");
  const [position, setPosition] = useState({ lat: DELIVERY_ORIGIN.lat, lng: DELIVERY_ORIGIN.lng });
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const handlePosition = useCallback((lat: number, lng: number) => setPosition({ lat, lng }), []);

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveAddressAction({ texto: text, lat: position.lat, lng: position.lng });
      if (!result.ok || !result.address) { setFeedback({ type: "error", text: result.message ?? "No se pudo guardar" }); return; }
      setAddresses((current) => [...current, result.address].slice(-5));
      setText("");
      setFeedback({ type: "success", text: result.message ?? "Dirección guardada" });
    });
  }

  function remove(id?: string) {
    if (!id) return;
    startTransition(async () => {
      const result = await deleteAddressAction(id);
      if (!result.ok) { setFeedback({ type: "error", text: result.message ?? "No se pudo eliminar" }); return; }
      setAddresses((current) => current.filter((address) => address.id !== id));
    });
  }

  return (
    <section className="surface space-y-4 p-5">
      <h2 className="text-xl font-black">Direcciones guardadas</h2>
      {feedback ? <p className={`alert ${feedback.type === "error" ? "alert-error" : "alert-success"}`} role="status">{feedback.text}</p> : null}
      {addresses.length ? <ul className="space-y-2">{addresses.map((address) => <li key={address.id ?? address.texto} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 text-sm"><span>{address.texto}</span><button type="button" className="text-xs font-bold text-[var(--danger)]" onClick={() => remove(address.id)}>Eliminar</button></li>)}</ul> : <p className="text-sm text-[var(--muted)]">Todavía no guardaste direcciones.</p>}
      <div className="grid gap-3 md:grid-cols-[1fr_280px]"><div><label className="form-label" htmlFor="saved-address-text">Nueva dirección</label><input id="saved-address-text" className="form-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="Calle, número, referencia" /><button type="button" className="btn btn-secondary mt-2" onClick={save} disabled={pending || !text.trim()}>Guardar dirección</button></div><DeliveryMap lat={position.lat} lng={position.lng} onChange={handlePosition} /></div>
    </section>
  );
}
