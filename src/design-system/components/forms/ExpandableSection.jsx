import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * ExpandableSection — collapsible region. The mechanism behind "고급 설정 보기"
 * (progressive disclosure) on the user surface: hide infra details until asked.
 */
export function ExpandableSection({ headerText, defaultExpanded = false, variant = "default", children, style }) {
  const [open, setOpen] = React.useState(defaultExpanded);
  const container = variant === "container";
  return (
    <div
      style={{
        border: container ? "1px solid var(--decs-border-container)" : "none",
        borderRadius: container ? "var(--decs-radius-container)" : 0,
        background: container ? "var(--decs-surface-container)" : "transparent",
        fontFamily: "var(--decs-font-base)",
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", width: "100%",
          padding: container ? "var(--decs-space-s) var(--decs-space-m)" : "var(--decs-space-xxs) 0",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
          color: "var(--decs-text-heading)", fontSize: "var(--decs-fs-heading-s)", fontWeight: "var(--decs-fw-bold)",
        }}
      >
        <span style={{ display: "inline-flex", transform: open ? "rotate(90deg)" : "none", transition: "transform var(--decs-motion-fast) var(--decs-easing)" }}>
          <Icon name="chevron-right" size={16} />
        </span>
        {headerText}
      </button>
      {open ? (
        <div style={{ padding: container ? "0 var(--decs-space-m) var(--decs-space-m)" : "var(--decs-space-xs) 0 0 var(--decs-space-l)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
