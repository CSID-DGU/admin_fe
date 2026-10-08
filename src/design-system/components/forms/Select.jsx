import React from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Icon } from "../icons/Icon.jsx";

/**
 * Select — dropdown single-select matching Cloudscape trigger + popover list.
 * options: [{ value, label, description?, disabled? }]
 *
 * 옵션 목록은 document.body에 포털로 그린다 — Container 등 카드형 컴포넌트가 둥근
 * 모서리를 위해 overflow:hidden을 쓰는데, 그 안에 이 목록을 그대로 두면 절대위치
 * 팝업이 카드 경계에서 잘려버린다(예: 사용자 관리의 역할/상태 필터 드롭다운).
 */
export function Select({ options = [], selectedValue, onChange, placeholder: placeholderProp, disabled, invalid, id, ariaLabel, style }) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t("ds.selectPlaceholder");
  const [open, setOpen] = React.useState(false);
  const [menuRect, setMenuRect] = React.useState(null);
  const ref = React.useRef(null);
  const menuRef = React.useRef(null);
  const selected = options.find((o) => o.value === selectedValue);

  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const updateRect = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) setMenuRect(rect);
    };
    updateRect();
    // 스크롤/리사이즈 중엔 트리거 위치가 바뀌므로 팝업 위치도 같이 갱신한다.
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const borderColor = invalid ? "var(--decs-status-error)" : open ? "var(--decs-border-focus)" : "var(--decs-border-input)";

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--decs-space-xs)",
          width: "100%", minHeight: "var(--decs-control-height)", padding: "var(--decs-space-xs) var(--decs-space-m)",
          fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)",
          color: selected ? "var(--decs-text-body)" : "var(--decs-text-inactive)",
          background: disabled ? "var(--decs-surface-disabled)" : "var(--decs-surface-input)",
          border: `1px solid ${borderColor}`, borderRadius: "var(--decs-radius-input)",
          boxShadow: open ? "0 0 0 1px var(--decs-border-focus)" : "none",
          cursor: disabled ? "default" : "pointer", textAlign: "left",
        }}
      >
        <span title={selected ? selected.label : placeholder} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected ? selected.label : placeholder}</span>
        <Icon name="chevron-down" size={16} color="var(--decs-text-secondary)" />
      </button>
      {open && menuRect ? createPortal(
        <div ref={menuRef} role="listbox" style={{
          position: "fixed", top: menuRect.bottom + 4, left: menuRect.left, width: menuRect.width, zIndex: 1000,
          background: "var(--decs-white)", border: "1px solid var(--decs-border-divider)",
          borderRadius: "var(--decs-radius-item)", boxShadow: "var(--decs-shadow-dropdown)",
          padding: "var(--decs-space-xxs)", maxHeight: "260px", overflowY: "auto",
        }}>
          {options.map((o) => {
            const isSel = o.value === selectedValue;
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={isSel}
                disabled={o.disabled}
                onClick={() => { setOpen(false); onChange?.(o.value, o); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "var(--decs-space-s) var(--decs-space-m)",
                  background: isSel ? "var(--decs-surface-selected)" : "none", border: "none",
                  borderRadius: "var(--decs-radius-badge)", cursor: o.disabled ? "default" : "pointer",
                  fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)",
                  color: o.disabled ? "var(--decs-text-disabled)" : "var(--decs-text-body)",
                }}
                onMouseEnter={(e) => { if (!o.disabled && !isSel) e.currentTarget.style.background = "var(--decs-surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--decs-surface-selected)" : "none"; }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  {o.label}
                  {isSel ? <Icon name="check" size={16} color="var(--decs-text-link)" /> : null}
                </span>
                {o.description ? <span style={{ display: "block", fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>{o.description}</span> : null}
              </button>
            );
          })}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
