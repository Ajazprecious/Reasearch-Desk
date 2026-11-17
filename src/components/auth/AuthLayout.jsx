import { ResearchDeskMark } from "@/components/Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  cardSize = "compact",
  tagline = "Everything your research needs, connected.",
  description = "Write, collaborate, submit, review and track progress from research setup to defence.",
}) {
  return (
    <div className="rd-auth-shell">
      <aside className="rd-auth-brand-panel">
        <div className="rd-auth-brand">
          <ResearchDeskMark tone="light" />
        </div>
        <div className="rd-auth-pitch">
          <h2>
            {tagline.startsWith("Everything") ? (
              <>Everything your<br />research<br />needs, connected.</>
            ) : (
              <>Manage your<br />research<br />work in one place.</>
            )}
          </h2>
          <p>{description}</p>
        </div>
        <div className="rd-auth-brand-footer">
          <strong>ResearchDesk</strong>
          <span>Research. Collaborate. Progress.</span>
        </div>
      </aside>

      <main className="rd-auth-main">
        <div className="rd-auth-mobile-brand">
          <ResearchDeskMark />
        </div>
        <div className={`rd-auth-card-wrap rd-auth-card-wrap-${cardSize}`}>
          <section className={`rd-auth-card rd-auth-card-${cardSize}`}>
            <div className="rd-auth-card-brand">
              <ResearchDeskMark />
            </div>
            <h1>{title}</h1>
            {subtitle && <p className="rd-auth-subtitle">{subtitle}</p>}
            <div className="rd-auth-content">{children}</div>
            {footer && <div className="rd-auth-footer">{footer}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
