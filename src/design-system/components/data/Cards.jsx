import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Cards — the user surface's primary layout. A responsive grid of cards, each
 * optionally selectable (선택 가능한 Cards for GPU/이미지 고르기). Toss-style:
 * information as tappable cards rather than dense rows.
 * items + cardDefinition:{ header:(it)=>node, sections:[{ id, header, content:(it)=>node }] }
 */
export function Cards({
  items = [],
  cardDefinition = {},
  columns = 3,
  selectionType,          // undefined | "single" | "multi"
  selectedItems = [],
  onSelectionChange,
  trackBy = "id",
  empty,
  style,
}) {
  const keyOf = (it) => it[trackBy];
  const selectedKeys = new Set(selectedItems.map(keyOf));
  const selectable = !!selectionType;

  function toggle(it) {
    if (!onSelectionChange) return;
    if (selectionType === "single") return onSelectionChange([it]);
    const has = selectedKeys.has(keyOf(it));
    onSelectionChange(has ? selectedItems.filter((s) => keyOf(s) !== keyOf(it)) : [...selectedItems, it]);
  }

  if (items.length === 0) {
    return <div style={{ padding: "var(--decs-space-xxl)", textAlign: "center", color: "var(--decs-text-secondary)", fontFamily: "var(--decs-font-base)" }}>{empty || "표시할 항목이 없습니다."}</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "var(--decs-space-m)", fontFamily: "var(--decs-font-base)", ...style }}>
      {items.map((it) => {
        const isSel = selectedKeys.has(keyOf(it));
        return (
          <div
            key={keyOf(it)}
            onClick={selectable ? () => toggle(it) : undefined}
            style={{
              position: "relative",
              background: "var(--decs-surface-container)",
              border: `1px solid ${isSel ? "var(--decs-action-primary)" : "var(--decs-border-container)"}`,
              boxShadow: isSel ? "0 0 0 1px var(--decs-action-primary)" : "var(--decs-shadow-container)",
              borderRadius: "var(--decs-radius-container)",
              padding: "var(--decs-space-l)",
              cursor: selectable ? "pointer" : "default",
              transition: "border-color var(--decs-motion-fast) var(--decs-easing), box-shadow var(--decs-motion-fast) var(--decs-easing)",
            }}
          >
            {selectable ? (
              <span style={{ position: "absolute", top: "var(--decs-space-m)", right: "var(--decs-space-m)", width: "20px", height: "20px", borderRadius: selectionType === "single" ? "9999px" : "6px", border: `1.5px solid ${isSel ? "var(--decs-action-primary)" : "var(--decs-grey-400)"}`, background: isSel ? "var(--decs-action-primary)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {isSel ? <Icon name="check" size={14} color="#fff" /> : null}
              </span>
            ) : null}
            {cardDefinition.header ? (
              <div style={{ fontSize: "var(--decs-fs-heading-s)", lineHeight: "var(--decs-lh-heading-s)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", paddingRight: selectable ? "28px" : 0 }}>
                {cardDefinition.header(it)}
              </div>
            ) : null}
            {(cardDefinition.sections || []).map((sec) => (
              <div key={sec.id} style={{ marginTop: "var(--decs-space-s)" }}>
                {sec.header ? <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "2px" }}>{sec.header}</div> : null}
                <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-body)" }}>{sec.content(it)}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
