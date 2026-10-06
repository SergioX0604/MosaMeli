import Link from "next/link";
import { TrackingLookup } from "@/components/tracking-lookup";
import type { FooterInfoPage as FooterInfoPageData } from "@/lib/footer-info";

function ActionLink({
  action,
  primary = false,
}: {
  action: { label: string; href: string };
  primary?: boolean;
}) {
  const external = action.href.startsWith("http");
  const className = primary ? "btn btn-primary" : "btn btn-secondary";
  return external ? (
    <a
      className={className}
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {action.label}
    </a>
  ) : (
    <Link className={className} href={action.href}>
      {action.label}
    </Link>
  );
}

export function FooterInfoPage({ page }: { page: FooterInfoPageData }) {
  return (
    <article className="info-page">
      <header className="info-page-hero">
        <span className="info-page-kicker">
          <span aria-hidden="true">✦</span>
          {page.kicker}
        </span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        {page.primaryAction || page.secondaryAction ? (
          <div className="info-page-actions">
            {page.primaryAction ? (
              <ActionLink action={page.primaryAction} primary />
            ) : null}
            {page.secondaryAction ? (
              <ActionLink action={page.secondaryAction} />
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="info-page-grid">
        {page.cards.map((card) => (
          <section className="info-page-card" key={card.title}>
            <span className="info-page-card-icon" aria-hidden="true">
              {card.icon}
            </span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </section>
        ))}
      </div>

      {page.note ? <p className="info-page-note">{page.note}</p> : null}
      {page.tracking ? (
        <div className="info-page-tracking">
          <TrackingLookup />
        </div>
      ) : null}
    </article>
  );
}
