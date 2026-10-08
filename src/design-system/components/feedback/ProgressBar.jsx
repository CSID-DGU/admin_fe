import React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        <div role="status" style={{ fontSize: "var(--decs-fs-body-m)", color: FILL[status] }}>{resultText}</div>
      ) : (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || description || t("ds.progress")}
          style={{ height: "4px", borderRadius: "9999px", background: "var(--decs-grey-200)", overflow: "hidden" }}
        >
          <div style={{ width: pct + "%", height: "100%", background: FILL[status], borderRadius: "9999px", transition: "width var(--decs-motion-slow) var(--decs-easing)" }} />
        </div>
      )}
      {description && !done ? (
        <div style={{ marginTop: "var(--decs-space-xxs)", fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>{description}</div>
      ) : null}
    </div>
  );
}
