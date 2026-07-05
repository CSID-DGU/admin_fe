import React from "react";

/**
 * ProgressBar — determinate progress for long operations (provisioning, image pull).
 * status: in-progress | success | error changes the fill color via status tokens.
 */
const FILL = {
  "in-progress": "var(--decs-status-in-progress)",
  success: "var(--decs-status-success)",
  error: "var(--decs-status-error)",
};

export function ProgressBar({ value = 0, status = "in-progress", label, description, resultText, style }) {
  const pct = Math.max(0, Math.min(100, value));
  const done = status !== "in-progress";
  return (
    <div style={{ fontFamily: "var(--decs-font-base)", ...style }}>
      {label ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--decs-space-xxs)" }}>
          <span style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-heading)", fontWeight: "var(--decs-fw-medium)" }}>{label}</span>
          {!done ? <span style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>{pct}%</span> : null}
        </div>
      ) : null}
      {done ? (
        <div style={{ fontSize: "var(--decs-fs-body-m)", color: FILL[status] }}>{resultText}</div>
      ) : (
        <div style={{ height: "4px", borderRadius: "9999px", background: "var(--decs-grey-200)", overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: FILL[status], borderRadius: "9999px", transition: "width var(--decs-motion-slow) var(--decs-easing)" }} />
        </div>
      )}
      {description && !done ? (
        <div style={{ marginTop: "var(--decs-space-xxs)", fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>{description}</div>
      ) : null}
    </div>
  );
}
