import React from "react";

/**
 * Header — section/page title with optional description, counter and actions.
 * variant h1 (page) | h2 (section, default) | h3 (subsection).
 */
const SIZES = {
  h1: { fs: "var(--decs-fs-heading-xl)", lh: "var(--decs-lh-heading-xl)" },
  h2: { fs: "var(--decs-fs-heading-l)",  lh: "var(--decs-lh-heading-l)" },
  h3: { fs: "var(--decs-fs-heading-m)",  lh: "var(--decs-lh-heading-m)" },
};

export function Header({ variant = "h2", children, description, counter, actions, style }) {
  const s = SIZES[variant] || SIZES.h2;
  const Tag = variant;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-m)", fontFamily: "var(--decs-font-base)", ...style }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Tag style={{ margin: 0, fontSize: s.fs, lineHeight: s.lh, fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", letterSpacing: "var(--decs-letter-spacing-heading)" }}>
          {children}
          {counter != null ? <span style={{ color: "var(--decs-text-inactive)", fontWeight: "var(--decs-fw-regular)" }}> {counter}</span> : null}
        </Tag>
        {description ? (
          <div style={{ marginTop: "var(--decs-space-xxs)", fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", color: "var(--decs-text-secondary)" }}>{description}</div>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: "var(--decs-space-xs)", flexShrink: 0, alignItems: "center" }}>{actions}</div> : null}
    </div>
  );
}
