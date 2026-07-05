import React from "react";

/**
 * Container — the standard content card in Cloudscape/DECS: white surface,
 * container radius, subtle border+shadow. Optional header and footer slots.
 */
export function Container({ header, footer, children, disablePadding = false, style }) {
  return (
    <section
      style={{
        background: "var(--decs-surface-container)",
        border: "1px solid var(--decs-border-container)",
        borderRadius: "var(--decs-radius-container)",
        boxShadow: "var(--decs-shadow-container)",
        overflow: "hidden",
        fontFamily: "var(--decs-font-base)",
        ...style,
      }}
    >
      {header ? (
        <div style={{ padding: "var(--decs-space-m) var(--decs-space-l)", borderBottom: "1px solid var(--decs-border-divider)" }}>
          {header}
        </div>
      ) : null}
      <div style={{ padding: disablePadding ? 0 : "var(--decs-space-l)" }}>{children}</div>
      {footer ? (
        <div style={{ padding: "var(--decs-space-s) var(--decs-space-l)", borderTop: "1px solid var(--decs-border-divider)", background: "var(--decs-surface-sunken)" }}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}
