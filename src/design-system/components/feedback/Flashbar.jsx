import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Flashbar — stacked page-level notifications for async operation results.
 * K8s provisioning takes time; use type "in-progress" (animated) rather than
 * pretending an action finished instantly.
 */
const CONFIG = {
  info:          { icon: "information-circle",   fg: "var(--decs-status-info)",        bg: "var(--decs-status-bg-info)",    bd: "var(--decs-status-border-info)" },
  success:       { icon: "check-circle",         fg: "var(--decs-status-success)",     bg: "var(--decs-status-bg-success)", bd: "var(--decs-status-border-success)" },
  warning:       { icon: "exclamation-triangle", fg: "var(--decs-status-warning)",     bg: "var(--decs-status-bg-warning)", bd: "var(--decs-status-border-warning)" },
  error:         { icon: "x-circle",             fg: "var(--decs-status-error)",       bg: "var(--decs-status-bg-error)",   bd: "var(--decs-status-border-error)" },
  "in-progress": { icon: "arrow-path",           fg: "var(--decs-status-in-progress)", bg: "var(--decs-status-bg-info)",    bd: "var(--decs-status-border-info)", spin: true },
};

function FlashItem({ type = "info", header, content, dismissible, onDismiss }) {
  const c = CONFIG[type] || CONFIG.info;
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--decs-space-s)",
        padding: "var(--decs-space-m) var(--decs-space-l)",
        background: c.bg,
        border: `1px solid ${c.bd}`,
        borderRadius: "var(--decs-radius-alert)",
        boxShadow: "var(--decs-shadow-flash)",
        fontFamily: "var(--decs-font-base)",
      }}
    >
      <span style={{ color: c.fg, flexShrink: 0, marginTop: "1px", display: "inline-flex", animation: c.spin ? "decs-spin 1s linear infinite" : "none" }}>
        <Icon name={c.icon} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)" }}>
        {header ? <span style={{ fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{header}{content ? " " : ""}</span> : null}
        {content ? <span style={{ color: "var(--decs-text-body)" }}>{content}</span> : null}
      </div>
      {dismissible ? (
        <button onClick={onDismiss} aria-label="Dismiss" style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--decs-text-secondary)", display: "inline-flex", padding: "var(--decs-space-xs)" }}>
          <Icon name="x-mark" size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function Flashbar({ items = [], style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", ...style }}>
      {items.map((it, i) => <FlashItem key={it.id ?? i} {...it} />)}
      <style>{"@keyframes decs-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
