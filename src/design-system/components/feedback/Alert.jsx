import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Alert — inline, in-context message (quota exceeded, uid collision warning, etc).
 * Admin surface: cause/state oriented. User surface: action oriented copy.
 * For transient operation results use Flashbar instead.
 */
const CONFIG = {
  info:    { icon: "information-circle",   fg: "var(--decs-status-info)",    bg: "var(--decs-status-bg-info)",    bd: "var(--decs-status-border-info)" },
  success: { icon: "check-circle",         fg: "var(--decs-status-success)", bg: "var(--decs-status-bg-success)", bd: "var(--decs-status-border-success)" },
  warning: { icon: "exclamation-triangle", fg: "var(--decs-status-warning)", bg: "var(--decs-status-bg-warning)", bd: "var(--decs-status-border-warning)" },
  error:   { icon: "x-circle",             fg: "var(--decs-status-error)",   bg: "var(--decs-status-bg-error)",   bd: "var(--decs-status-border-error)" },
};

export function Alert({ type = "info", header, children, action, dismissible, onDismiss, style }) {
  const c = CONFIG[type] || CONFIG.info;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: "var(--decs-space-s)",
        padding: "var(--decs-space-s) var(--decs-space-m)",
        background: c.bg,
        border: `1px solid ${c.bd}`,
        borderRadius: "var(--decs-radius-alert)",
        fontFamily: "var(--decs-font-base)",
        ...style,
      }}
    >
      <span style={{ color: c.fg, flexShrink: 0, marginTop: "1px" }}><Icon name={c.icon} size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {header ? (
          <div style={{ fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", marginBottom: children ? "var(--decs-space-xxs)" : 0 }}>{header}</div>
        ) : null}
        {children ? (
          <div style={{ color: "var(--decs-text-body)", fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)" }}>{children}</div>
        ) : null}
      </div>
      {action ? <div style={{ flexShrink: 0, alignSelf: "center" }}>{action}</div> : null}
      {dismissible ? (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--decs-text-secondary)", padding: "2px", borderRadius: "var(--decs-radius-badge)", display: "inline-flex" }}
        >
          <Icon name="x-mark" size={16} />
        </button>
      ) : null}
    </div>
  );
}
