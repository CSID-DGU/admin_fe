import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons/Icon.jsx";

/**
 * navigator.clipboard는 보안 컨텍스트(HTTPS/localhost)에서만 존재한다. 이 사이트는
 * 현재 평문 HTTP로 서빙되므로 그 API가 undefined라 조용히 아무 일도 안 한다 —
 * document.execCommand("copy") 폴백은 HTTP에서도 동작한다.
 */
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 폴백으로 계속 진행
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

/**
 * KeyValuePairs — labeled read-only detail pairs (resource spec, uid/gid,
 * volume, SSH access info). Lays out across `columns`. A value may include a
 * copy button via item.copyable + copyText. item.fullWidth spans every column;
 * item.multiline keeps the value's line breaks (free text a user typed).
 */
function CopyValue({ text }) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <code style={{ fontFamily: "var(--decs-font-mono)", fontSize: "var(--decs-fs-body-s)", background: "var(--decs-grey-100)", padding: "1px 6px", borderRadius: "var(--decs-radius-badge)", color: "var(--decs-text-body)" }}>{text}</code>
      <button
        onClick={async () => {
          const success = await copyToClipboard(text);
          if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }
        }}
        aria-label={t("ds.copy")} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "var(--decs-status-success)" : "var(--decs-text-secondary)", display: "inline-flex", padding: 0 }}
      >
        <Icon name={copied ? "check" : "clipboard"} size={14} />
      </button>
    </span>
  );
}

export function KeyValuePairs({ items = [], columns = 2, style }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "var(--decs-space-m) var(--decs-space-xl)", fontFamily: "var(--decs-font-base)", ...style }}>
      {items.map((it, i) => (
        <div key={i} style={{ minWidth: 0, gridColumn: it.fullWidth ? "1 / -1" : undefined }}>
          <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "2px" }}>{it.label}</div>
          {/* 사용자가 적은 긴 글(띄어쓰기 없는 문자열 포함)이 옆 칸을 침범하지 않게 칸 안에서 줄을 바꾼다. */}
          <div style={{ fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", color: "var(--decs-text-body)", overflowWrap: "anywhere", whiteSpace: it.multiline ? "pre-wrap" : undefined }}>
            {it.copyable ? <CopyValue text={it.copyText ?? it.value} /> : it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
