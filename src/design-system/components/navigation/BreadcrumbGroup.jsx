import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * BreadcrumbGroup — path trail above a page title. items: [{ text, href }]
 */
export function BreadcrumbGroup({ items = [], onFollow, style }) {
  return (
    <nav aria-label="breadcrumb" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)", ...style }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {last ? (
              <span style={{ color: "var(--decs-text-secondary)" }}>{it.text}</span>
            ) : (
              <a href={it.href} onClick={(e) => { if (onFollow) { e.preventDefault(); onFollow(it); } }} style={{ color: "var(--decs-text-link)", textDecoration: "none" }}>{it.text}</a>
            )}
            {!last ? <Icon name="chevron-right" size={12} color="var(--decs-grey-400)" /> : null}
          </span>
        );
      })}
    </nav>
  );
}
