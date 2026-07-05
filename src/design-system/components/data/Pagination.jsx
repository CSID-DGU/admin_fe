import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Pagination — page navigator for tables. Controlled via currentPage + onChange.
 */
export function Pagination({ currentPage = 1, pagesCount = 1, onChange, style }) {
  const pages = [];
  const max = pagesCount;
  const cur = currentPage;
  // windowed page numbers
  const window = 5;
  let start = Math.max(1, cur - Math.floor(window / 2));
  let end = Math.min(max, start + window - 1);
  start = Math.max(1, end - window + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn = (active) => ({
    minWidth: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "none", background: active ? "var(--decs-surface-selected)" : "none",
    color: active ? "var(--decs-text-link)" : "var(--decs-text-secondary)",
    fontWeight: active ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)",
    borderRadius: "var(--decs-radius-item)", cursor: "pointer",
    fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)", padding: "0 6px",
  });

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "2px", ...style }}>
      <button aria-label="이전" disabled={cur <= 1} onClick={() => onChange?.(cur - 1)} style={{ ...btn(false), cursor: cur <= 1 ? "default" : "pointer", color: cur <= 1 ? "var(--decs-text-disabled)" : "var(--decs-text-secondary)" }}>
        <Icon name="chevron-left" size={16} />
      </button>
      {start > 1 ? <span style={{ color: "var(--decs-text-inactive)", padding: "0 4px" }}>…</span> : null}
      {pages.map((p) => (
        <button key={p} onClick={() => onChange?.(p)} aria-current={p === cur} style={btn(p === cur)}>{p}</button>
      ))}
      {end < max ? <span style={{ color: "var(--decs-text-inactive)", padding: "0 4px" }}>…</span> : null}
      <button aria-label="다음" disabled={cur >= max} onClick={() => onChange?.(cur + 1)} style={{ ...btn(false), cursor: cur >= max ? "default" : "pointer", color: cur >= max ? "var(--decs-text-disabled)" : "var(--decs-text-secondary)" }}>
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  );
}
