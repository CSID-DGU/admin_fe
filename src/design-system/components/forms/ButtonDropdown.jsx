import React from "react";
import { Icon } from "../icons/Icon.jsx";
import { Button } from "./Button.jsx";

/**
 * ButtonDropdown — a trigger button that opens a menu of actions. Used for
 * per-row action menus in admin tables (Restart / Stop / Logs / Delete).
 * Items with variant "danger" render in the error color.
 */
export function ButtonDropdown({ items = [], children = "작업", variant = "normal", onItemClick, style }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      <Button variant={variant} iconName="chevron-down" iconAlign="right" onClick={() => setOpen((o) => !o)}>
        {children}
      </Button>
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: "180px",
            background: "var(--decs-white)",
            border: "1px solid var(--decs-border-divider)",
            borderRadius: "var(--decs-radius-item)",
            boxShadow: "var(--decs-shadow-dropdown)",
            padding: "var(--decs-space-xxs)",
            zIndex: 50,
          }}
        >
          {items.map((it, i) => (
            <button
              key={it.id ?? i}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpen(false); (it.onClick || onItemClick)?.(it); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--decs-space-xs)",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "none",
                border: "none",
                borderRadius: "var(--decs-radius-badge)",
                cursor: it.disabled ? "default" : "pointer",
                fontFamily: "var(--decs-font-base)",
                fontSize: "var(--decs-fs-body-m)",
                color: it.disabled ? "var(--decs-text-disabled)" : it.variant === "danger" ? "var(--decs-status-error)" : "var(--decs-text-body)",
              }}
              onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = "var(--decs-surface-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {it.iconName ? <Icon name={it.iconName} size={16} /> : null}
              {it.text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
