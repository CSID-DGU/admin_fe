import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Modal — centered dialog for confirmations and focused forms. Irreversible
 * actions (delete container, release volume) MUST go through a Modal confirm.
 * Pass footer actions via `footer` (usually Cancel + primary/danger button).
 */
let modalIdCounter = 0;

export function Modal({ visible, onDismiss, header, children, footer, size = "medium", style, dismissible = true }) {
  const titleId = React.useRef(`decs-modal-title-${++modalIdCounter}`).current;
  const dialogRef = React.useRef(null);

  // 열릴 때 한 번만 포커스를 다이얼로그로 옮긴다. onDismiss는 대부분 호출부에서
  // 인라인 함수로 넘어와 렌더마다 참조가 바뀌므로, 이 effect의 의존성에 넣으면
  // 다이얼로그 안 입력 필드에 한 글자 칠 때마다(부모 리렌더 → onDismiss 재생성)
  // 포커스가 다이얼로그 컨테이너로 다시 뺏겨서 한 글자씩만 입력되는 버그가 생긴다.
  React.useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
  }, [visible]);

  React.useEffect(() => {
    if (!visible || !dismissible) return;
    const onKeyDown = (e) => { if (e.key === "Escape") onDismiss?.(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, dismissible, onDismiss]);

  if (!visible) return null;
  const widths = { small: "400px", medium: "600px", large: "800px" };
  return (
    <div
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onDismiss?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0, 7, 22, 0.35)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "10vh var(--decs-space-m) var(--decs-space-m)",
        fontFamily: "var(--decs-font-base)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: widths[size] || widths.medium, maxWidth: "100%", maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          background: "var(--decs-white)", borderRadius: "var(--decs-radius-container)",
          boxShadow: "var(--decs-shadow-modal)", overflow: "hidden", ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-m)", padding: "var(--decs-space-xl) var(--decs-space-xl) var(--decs-space-m)" }}>
          <h2 id={titleId} style={{ flex: 1, margin: 0, fontSize: "var(--decs-fs-heading-l)", lineHeight: "var(--decs-lh-heading-l)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{header}</h2>
          {dismissible ? (
            <button onClick={onDismiss} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--decs-text-secondary)", display: "inline-flex", padding: "var(--decs-space-xs)" }}>
              <Icon name="x-mark" size={18} />
            </button>
          ) : null}
        </div>
        <div style={{ padding: "0 var(--decs-space-xl) var(--decs-space-xl)", overflowY: "auto", fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", color: "var(--decs-text-body)" }}>
          {children}
        </div>
        {footer ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--decs-space-xs)", padding: "var(--decs-space-m) var(--decs-space-xl)", borderTop: "1px solid var(--decs-border-divider)" }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
