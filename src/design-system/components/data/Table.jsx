import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Table — the admin surface's primary component. Dense, sortable, selectable.
 * columns: [{ id, header, cell:(item)=>node, width, sortingField, minWidth }]
 * density: "compact" (admin default) | "comfortable" (user views).
 */
export function Table({
  columns = [],
  items = [],
  density = "compact",
  selectionType,           // undefined | "single" | "multi"
  selectedItems = [],
  onSelectionChange,
  trackBy = "id",
  sortingColumn,
  sortingDescending = false,
  onSortingChange,
  header,
  footer,
  empty,
  loading = false,
  style,
}) {
  const padY = density === "compact" ? "var(--decs-density-compact-cell-y)" : "var(--decs-density-comfortable-cell-y)";
  const padX = density === "compact" ? "var(--decs-density-compact-cell-x)" : "var(--decs-density-comfortable-cell-x)";
  const keyOf = (it) => it[trackBy];
  const selectedKeys = new Set(selectedItems.map(keyOf));
  const allSelected = items.length > 0 && items.every((it) => selectedKeys.has(keyOf(it)));

  function toggleRow(it) {
    if (!onSelectionChange) return;
    if (selectionType === "single") return onSelectionChange([it]);
    const has = selectedKeys.has(keyOf(it));
    onSelectionChange(has ? selectedItems.filter((s) => keyOf(s) !== keyOf(it)) : [...selectedItems, it]);
  }
  function toggleAll() {
    onSelectionChange?.(allSelected ? [] : [...items]);
  }
  function clickSort(col) {
    if (!col.sortingField || !onSortingChange) return;
    const desc = sortingColumn?.id === col.id ? !sortingDescending : false;
    onSortingChange({ sortingColumn: col, sortingDescending: desc });
  }

  const cellBase = { padding: `${padY} ${padX}`, fontSize: "var(--decs-fs-body-m)", lineHeight: "var(--decs-lh-body-m)", textAlign: "left", verticalAlign: "middle", borderBottom: "1px solid var(--decs-border-divider)" };

  return (
    <div style={{ fontFamily: "var(--decs-font-base)", ...style }}>
      {header ? <div style={{ padding: `var(--decs-space-s) var(--decs-space-l)`, borderBottom: "1px solid var(--decs-border-divider)" }}>{header}</div> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {selectionType ? (
                <th style={{ ...cellBase, width: "40px", background: "var(--decs-surface-sunken)" }}>
                  {selectionType === "multi" ? (
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="전체 선택" style={{ accentColor: "var(--decs-action-primary)" }} />
                  ) : null}
                </th>
              ) : null}
              {columns.map((col) => {
                const sorted = sortingColumn?.id === col.id;
                return (
                  <th
                    key={col.id}
                    onClick={() => clickSort(col)}
                    style={{ ...cellBase, width: col.width, minWidth: col.minWidth, background: "var(--decs-surface-sunken)", color: "var(--decs-text-secondary)", fontWeight: "var(--decs-fw-bold)", cursor: col.sortingField ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {col.header}
                      {col.sortingField ? <Icon name={sorted ? (sortingDescending ? "chevron-down" : "chevron-up") : "chevron-up"} size={12} color={sorted ? "var(--decs-text-body)" : "var(--decs-grey-300)"} /> : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={columns.length + (selectionType ? 1 : 0)} style={{ ...cellBase, textAlign: "center", padding: "var(--decs-space-xxl)", color: "var(--decs-text-secondary)" }}>{loading ? "불러오는 중…" : empty || "표시할 항목이 없습니다."}</td></tr>
            ) : items.map((it) => {
              const isSel = selectedKeys.has(keyOf(it));
              return (
                <tr key={keyOf(it)} style={{ background: isSel ? "var(--decs-surface-selected)" : "transparent" }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--decs-surface-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--decs-surface-selected)" : "transparent"; }}>
                  {selectionType ? (
                    <td style={{ ...cellBase, textAlign: "center" }}>
                      <input type={selectionType === "single" ? "radio" : "checkbox"} checked={isSel} onChange={() => toggleRow(it)} aria-label="행 선택" style={{ accentColor: "var(--decs-action-primary)" }} />
                    </td>
                  ) : null}
                  {columns.map((col) => (
                    <td key={col.id} style={{ ...cellBase, color: "var(--decs-text-body)" }}>{col.cell(it)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer ? <div style={{ padding: `var(--decs-space-s) var(--decs-space-l)`, borderTop: "1px solid var(--decs-border-divider)" }}>{footer}</div> : null}
    </div>
  );
}
