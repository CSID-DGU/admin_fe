import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons/Icon.jsx";
import { Button } from "./Button.jsx";

/**
 * ButtonDropdown — a trigger button that opens a menu of actions. Used for
 * per-row action menus in admin tables (Restart / Stop / Logs / Delete).
 * Items with variant "danger" render in the error color.
 */
export function ButtonDropdown({ items = [], children: childrenProp, variant = "normal", trigger = "label", ariaLabel, onItemClick, style }) {
  const { t } = useTranslation();
  const children = childrenProp ?? t("ds.actions");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // 트리거 아래 공간이 부족하고(테이블 마지막 줄 등) 위쪽 공간이 더 넓으면 위로 뒤집어서
  // 연다 — 안 그러면 화면 하단 근처에서 열린 메뉴가 뷰포트 밖으로 잘려나간다.
  const MENU_MAX_HEIGHT = 260;
  const [openUpward, setOpenUpward] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpward(spaceBelow < MENU_MAX_HEIGHT + 4 && spaceAbove > spaceBelow);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      {trigger === "icon" ? (
        <Button
          variant="icon"
          iconName="ellipsis-vertical"
          ariaLabel={ariaLabel ?? (typeof children === "string" ? children : t("ds.actions"))}
          onClick={() => setOpen((o) => !o)}
        />
      ) : (
        <Button variant={variant} iconName="chevron-down" iconAlign="right" onClick={() => setOpen((o) => !o)}>
          {children}
        </Button>
      )}
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
            right: 0,
            minWidth: "180px",
            maxHeight: `${MENU_MAX_HEIGHT}px`,
            overflowY: "auto",
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
