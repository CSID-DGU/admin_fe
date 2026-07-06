import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * TopNavigation — the global top bar: brand identity on the left, utility
 * actions (notifications, density, user menu) on the right.
 * utilities: [{ type:"button", text?, iconName?, badge?, onClick } | { type:"menu", text, iconName?, items:[] }]
 */
export function TopNavigation({ identity, utilities = [], style }) {
  const [openMenu, setOpenMenu] = React.useState(null);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "48px", padding: "0 var(--decs-space-m)",
      background: "var(--decs-grey-900)", color: "#fff",
      fontFamily: "var(--decs-font-base)", ...style,
    }}>
      <a href={identity?.href || "#"} onClick={(e) => { if (identity?.onFollow) { e.preventDefault(); identity.onFollow(); } }}
         style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", textDecoration: "none", color: "#fff" }}>
        {identity?.logo ? <img src={identity.logo} alt="" style={{ height: "22px", width: "auto" }} /> : null}
        <span style={{ fontSize: "var(--decs-fs-heading-s)", fontWeight: "var(--decs-fw-bold)" }}>{identity?.title}</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xxs)" }}>
        {utilities.map((u, i) => (
          <div key={i} style={{ position: "relative" }}>
            <button onClick={() => u.type === "menu" ? setOpenMenu(openMenu === i ? null : i) : u.onClick?.()} aria-label={u.ariaLabel || (typeof u.text === "string" ? u.text : undefined)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", position: "relative",
                background: "none", border: "none", color: "rgba(255,255,255,0.9)", cursor: "pointer",
                padding: "6px 10px", borderRadius: "var(--decs-radius-item)", fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
              {u.iconName ? <Icon name={u.iconName} size={18} /> : null}
              {u.text ? <span>{u.text}</span> : null}
              {u.type === "menu" ? <Icon name="chevron-down" size={14} /> : null}
              {u.badge != null ? <span style={{ position: "absolute", top: "2px", right: "4px", minWidth: "16px", height: "16px", padding: "0 4px", boxSizing: "border-box", borderRadius: "9999px", background: "var(--decs-action-primary)", color: "#fff", fontSize: "10px", fontWeight: "var(--decs-fw-bold)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{u.badge}</span> : null}
            </button>
            {u.type === "menu" && openMenu === i ? (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 180, background: "var(--decs-surface-container)", color: "var(--decs-text-body)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-xxs)", zIndex: 20 }}>
                {(u.items || []).map((item, j) => item.type === "divider" ? (
                  <div key={j} style={{ height: 1, background: "var(--decs-border-divider)", margin: "var(--decs-space-xxs) 0" }} />
                ) : (
                  <button key={j} onClick={() => { setOpenMenu(null); item.onClick?.(item); }} style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: "7px 10px", borderRadius: "var(--decs-radius-item)", color: "var(--decs-text-body)", fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)" }}>
                    {item.text}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </header>
  );
}
