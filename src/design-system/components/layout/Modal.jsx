import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Modal — centered dialog for confirmations and focused forms. Irreversible
 * actions (delete container, release volume) MUST go through a Modal confirm.
 * Pass footer actions via `footer` (usually Cancel + primary/danger button).
 */
export function Modal({ visible, onDismiss, header, children, footer, size = "medium", style }) {
  if (!visible) return null;
  const widths = { small: "360px", medium: "520px", large: "720px" };
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0, 7, 22, 0.35)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "10vh var(--decs-space-m) var(--decs-space-m)",
        fontFamily: "var(--decs-font-base)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: widths[size] || widths.medium, maxWidth: "100%", maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          background: "var(--decs-white)", borderRadius: "var(--decs-radius-container)",
          boxShadow: "var(--decs-shadow-modal)", overflow: "hidden", ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-m)", padding: "var(--decs-space-l) var(--decs-space-l) var(--decs-space-s)" }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: "var(--decs-fs-heading-l)", lineHeight: "var(--decs-lh-heading-l)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{header}</h2>
          <button onClick={onDismiss} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--decs-text-secondary)", display: "inline-flex", padding: "2px", marginTop: "2px" }}>
            <Icon name="x-mark" size={18} />
          </button>
        </div>
        <div style={{ padding: "0 var(--decs-space-l) var(--decs-space-l)", overflowY: "auto", fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", color: "var(--decs-text-body)" }}>
          {children}
        </div>
        {footer ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--decs-space-xs)", padding: "var(--decs-space-s) var(--decs-space-l)", borderTop: "1px solid var(--decs-border-divider)" }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
