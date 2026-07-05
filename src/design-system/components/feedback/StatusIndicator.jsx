import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * StatusIndicator — the single source of truth for how a status LOOKS in DECS.
 * Both surfaces (user + admin) render the same enum through this component so a
 * status never appears in two different colors. Map your domain status to one of
 * these Cloudscape types before rendering.
 */
const CONFIG = {
  success:       { color: "var(--decs-status-success)",     icon: "check-circle" },
  error:         { color: "var(--decs-status-error)",       icon: "x-circle" },
  warning:       { color: "var(--decs-status-warning)",     icon: "exclamation-triangle" },
  info:          { color: "var(--decs-status-info)",        icon: "information-circle" },
  "in-progress": { color: "var(--decs-status-in-progress)", icon: "arrow-path", spin: true },
  loading:       { color: "var(--decs-status-in-progress)", icon: "arrow-path", spin: true },
  pending:       { color: "var(--decs-status-pending)",     icon: "clock" },
  stopped:       { color: "var(--decs-status-stopped)",     icon: "no-symbol" },
};

export function StatusIndicator({ type = "info", children, iconSize = 16, style }) {
  const cfg = CONFIG[type] || CONFIG.info;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--decs-space-xxs)",
        color: cfg.color,
        fontFamily: "var(--decs-font-base)",
        fontSize: "var(--decs-fs-body-m)",
        lineHeight: "var(--decs-lh-body-m)",
        ...style,
      }}
    >
      <span style={cfg.spin ? { display: "inline-flex", animation: "decs-spin 1s linear infinite" } : { display: "inline-flex" }}>
        <Icon name={cfg.icon} size={iconSize} />
      </span>
      <span style={{ color: "var(--decs-text-body)" }}>{children}</span>
      <style>{"@keyframes decs-spin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}
