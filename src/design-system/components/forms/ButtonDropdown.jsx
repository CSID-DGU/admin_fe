import React from "react";
import { createPortal } from "react-dom";
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
  const menuRef = React.useRef(null);

  // 메뉴는 body로 포털해 position:fixed로 띄운다 — 테이블(overflow-x:auto)·Container(overflow:hidden) 안에서 잘리지 않게.
  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // 트리거 아래 공간이 부족하고(테이블 마지막 줄 등) 위쪽 공간이 더 넓으면 위로 뒤집어서
  // 연다 — 안 그러면 화면 하단 근처에서 열린 메뉴가 뷰포트 밖으로 잘려나간다.
  const MENU_MAX_HEIGHT = 260;
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!open || !ref.current) { setPos(null); return; }
    const place = () => {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < MENU_MAX_HEIGHT + 4 && rect.top > spaceBelow;
      setPos({
        right: window.innerWidth - rect.right,
        ...(upward ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    };
    place();
    // 스크롤·리사이즈 시 트리거에서 떨어지지 않게 닫는다.
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
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
      {open && pos ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            ...pos,
            minWidth: "180px",
            maxHeight: `${MENU_MAX_HEIGHT}px`,
            overflowY: "auto",
            background: "var(--decs-white)",
            border: "1px solid var(--decs-border-divider)",
            borderRadius: "var(--decs-radius-item)",
            boxShadow: "var(--decs-shadow-dropdown)",
            padding: "var(--decs-space-xxs)",
            zIndex: 1100,
          }}
        >
          {items.map((it, i) => (
            <button
              key={it.id ?? i}
              role="menuitem"
              className="decs-hv"
              disabled={it.disabled}
              onClick={() => { setOpen(false); (it.onClick || onItemClick)?.(it); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--decs-space-xs)",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                "--hv-hover": "var(--decs-surface-hover)",
                border: "none",
                borderRadius: "var(--decs-radius-badge)",
                cursor: it.disabled ? "default" : "pointer",
                fontFamily: "var(--decs-font-base)",
                fontSize: "var(--decs-fs-body-m)",
                color: it.disabled ? "var(--decs-text-disabled)" : it.variant === "danger" ? "var(--decs-status-error)" : "var(--decs-text-body)",
              }}
            >
              {it.iconName ? <Icon name={it.iconName} size={16} /> : null}
              {it.text}
            </button>
          ))}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
