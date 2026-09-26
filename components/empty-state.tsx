export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">🧺</div>
      <h2 className="text-lg font-black">{title}</h2>
      <p className="max-w-md text-sm text-[var(--muted)]">{description}</p>
      {action}
    </div>
  );
}
