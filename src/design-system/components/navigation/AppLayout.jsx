import React from "react";
import { TopNavigation } from "./TopNavigation.jsx";
import { NARROW_QUERY, PHONE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery.js";

/**
 * AppLayout — the app shell: fixed TopNavigation, a left navigation column, a
 * scrollable content column, and an optional right tools panel. Compose
 * SideNavigation into `navigation` and page content into `children`.
 * This is step 1 of adoption — unify the shell and the console reads consistent.
 */
export function AppLayout({
  identity,
  utilities,
  navigation,
  navigationWidth = 260,
  tools,
  toolsWidth = 320,
  toolsOpen = false,
  breadcrumbs,
  notifications,
  contentMaxWidth = 1280,
  children,
  style,
}) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const phone = useMediaQuery(PHONE_QUERY);
  const [navigationOpen, setNavigationOpen] = React.useState(false);

  React.useEffect(() => { if (!narrow) setNavigationOpen(false); }, [narrow]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--decs-surface-app)", fontFamily: "var(--decs-font-base)", ...style }}>
      {(identity || utilities) ? <TopNavigation identity={identity} utilities={utilities || []} compact={phone} navigationOpen={navigationOpen} onNavigationToggle={narrow && navigation ? () => setNavigationOpen((open) => !open) : undefined} /> : null}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {navigation && (!narrow || navigationOpen) ? (
          <>
            {narrow ? <div onClick={() => setNavigationOpen(false)} style={{ position: "fixed", inset: "48px 0 0", zIndex: 30, background: "var(--decs-surface-overlay)" }} /> : null}
            <div onClick={() => narrow && setNavigationOpen(false)} style={narrow ? { position: "fixed", top: "48px", bottom: 0, left: 0, zIndex: 31, width: navigationWidth, overflow: "hidden" } : { width: navigationWidth, flexShrink: 0, height: "100%", overflow: "hidden" }}>{navigation}</div>
          </>
        ) : null}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: contentMaxWidth, margin: "0 auto", padding: phone ? "var(--decs-space-m)" : "var(--decs-space-xl) var(--decs-space-xxl)", boxSizing: "border-box" }}>
            {breadcrumbs ? <div style={{ marginBottom: "var(--decs-space-m)" }}>{breadcrumbs}</div> : null}
            {notifications ? <div style={{ marginBottom: "var(--decs-space-l)" }}>{notifications}</div> : null}
            {children}
          </div>
        </main>
        {tools && toolsOpen ? (
          <aside style={{ width: toolsWidth, flexShrink: 0, height: "100%", overflowY: "auto", background: "var(--decs-surface-container)", borderLeft: "1px solid var(--decs-border-divider)", padding: "var(--decs-space-l)", boxSizing: "border-box" }}>{tools}</aside>
        ) : null}
      </div>
    </div>
  );
}
