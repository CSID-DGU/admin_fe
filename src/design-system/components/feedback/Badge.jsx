import React from "react";

/**
 * Badge — small label for tags, counts, categories (GPU type, node name, role).
 * Cloudscape-style: subtle tinted background, small radius. `color` picks a semantic tint.
 */
const TINTS = {
  grey:  { bg: "var(--decs-grey-150)", fg: "var(--decs-grey-700)" },
  blue:  { bg: "#e6f2fd", fg: "var(--decs-blue-700)" },
  green: { bg: "var(--decs-status-bg-success)", fg: "var(--decs-status-success)" },
  red:   { bg: "var(--decs-status-bg-error)", fg: "var(--decs-status-error)" },
  amber: { bg: "var(--decs-status-bg-warning)", fg: "var(--decs-status-warning)" },
  brand: { bg: "var(--decs-brand-100)", fg: "var(--decs-brand-700)" },
};

export function Badge({ color = "grey", children, style }) {
  const t = TINTS[color] || TINTS.grey;
  return (
    <span
      title={typeof children === "string" ? children : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 var(--decs-space-xs)",
        minHeight: "18px",
        borderRadius: "var(--decs-radius-badge)",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--decs-font-base)",
        fontSize: "var(--decs-fs-body-s)",
        lineHeight: "var(--decs-lh-body-s)",
        fontWeight: "var(--decs-fw-medium)",
        whiteSpace: "nowrap",
        maxWidth: "160px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
