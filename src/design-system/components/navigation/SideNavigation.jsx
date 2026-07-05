import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * SideNavigation — the left menu (Cloudscape). Sections + links, one active
 * href. Items: { type:"link", text, href, icon? } | { type:"section", text, items:[] } | { type:"divider" }
 */
function LinkItem({ item, activeHref, onFollow, depth = 0 }) {
  const active = item.href === activeHref;
  return (
    <a
      href={item.href}
      onClick={(e) => { if (onFollow) { e.preventDefault(); onFollow(item); } }}
      style={{
        display: "flex", alignItems: "center", gap: "var(--decs-space-xs)",
        padding: "6px var(--decs-space-s)", paddingLeft: `calc(var(--decs-space-s) + ${depth * 16}px)`,
        borderRadius: "var(--decs-radius-item)", textDecoration: "none",
        fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)",
        color: active ? "var(--decs-text-link)" : "var(--decs-text-body)",
        fontWeight: active ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)",
        background: active ? "var(--decs-surface-selected)" : "transparent",
        boxShadow: active ? "inset 2px 0 0 0 var(--decs-action-primary)" : "none",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--decs-surface-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {item.icon ? <Icon name={item.icon} size={16} /> : null}
      <span style={{ flex: 1 }}>{item.text}</span>
      {item.badge != null ? <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)" }}>{item.badge}</span> : null}
    </a>
  );
}

export function SideNavigation({ header, items = [], activeHref, onFollow, style }) {
  return (
    <nav style={{ width: "100%", height: "100%", background: "var(--decs-surface-nav)", borderRight: "1px solid var(--decs-border-divider)", padding: "var(--decs-space-m) var(--decs-space-s)", boxSizing: "border-box", fontFamily: "var(--decs-font-base)", overflowY: "auto", ...style }}>
      {header ? (
        <div style={{ padding: "0 var(--decs-space-s) var(--decs-space-s)", borderBottom: "1px solid var(--decs-border-divider)", marginBottom: "var(--decs-space-s)" }}>
          <a href={header.href} onClick={(e) => { if (onFollow) { e.preventDefault(); onFollow(header); } }} style={{ fontSize: "var(--decs-fs-heading-s)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", textDecoration: "none" }}>{header.text}</a>
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {items.map((item, i) => {
          if (item.type === "divider") return <div key={i} style={{ height: "1px", background: "var(--decs-border-divider)", margin: "var(--decs-space-s) var(--decs-space-s)" }} />;
          if (item.type === "section") return (
            <div key={i} style={{ marginTop: "var(--decs-space-s)" }}>
              <div style={{ padding: "4px var(--decs-space-s)", fontSize: "var(--decs-fs-body-s)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-inactive)", textTransform: "none" }}>{item.text}</div>
              {(item.items || []).map((sub, j) => <LinkItem key={j} item={sub} activeHref={activeHref} onFollow={onFollow} />)}
            </div>
          );
          return <LinkItem key={i} item={item} activeHref={activeHref} onFollow={onFollow} />;
        })}
      </div>
    </nav>
  );
}
