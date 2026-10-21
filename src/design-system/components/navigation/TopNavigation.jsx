import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons/Icon.jsx";

/**
 * TopNavigation — the global top bar: brand identity on the left, utility
 * actions (notifications, density, user menu) on the right.
 * compact (휴대폰 폭): 아이콘이 있는 항목은 글자를 숨겨 한 줄에 들어가게 한다.
 * utilities: [{ type:"button", text?, iconName?, badge?, onClick } | { type:"menu", text, iconName?, items:[] } | { type:"custom", content:<node> }]
 */
export function TopNavigation({ identity, utilities = [], compact = false, navigationOpen, onNavigationToggle, style }) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = React.useState(null);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "48px", padding: "0 var(--decs-space-m)",
      background: "var(--decs-grey-900)", color: "#fff",
      fontFamily: "var(--decs-font-base)", ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        {onNavigationToggle ? <button onClick={onNavigationToggle} aria-label={navigationOpen ? t("ds.closeMenu") : t("ds.openMenu")} style={{ display: "inline-flex", flexShrink: 0, background: "none", border: "none", color: "var(--decs-text-inverse)", cursor: "pointer", padding: "var(--decs-space-xs)", marginRight: "var(--decs-space-xxs)" }}><Icon name={navigationOpen ? "x-mark" : "bars-3"} size={20} /></button> : null}
        <a href={identity?.href || "#"} onClick={(e) => { if (identity?.onFollow) { e.preventDefault(); identity.onFollow(); } }}
           style={{ display: "flex", alignItems: "center", minWidth: 0, gap: "var(--decs-space-xs)", textDecoration: "none", color: "var(--decs-text-inverse)" }}>
          {identity?.logo ? <img src={identity.logo} alt="" style={{ height: "22px", width: "auto", flexShrink: 0 }} /> : null}
          <span title={identity?.title} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--decs-fs-heading-s)", fontWeight: "var(--decs-fw-bold)" }}>{identity?.title}</span>
        </a>
      </div>
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0, whiteSpace: "nowrap", gap: "var(--decs-space-xxs)" }}>
        {utilities.map((u, i) => u.type === "custom" ? (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>{u.content}</div>
        ) : (
          <div key={i} style={{ position: "relative" }}>
            <button className="decs-hv" onClick={() => u.type === "menu" ? setOpenMenu(openMenu === i ? null : i) : u.onClick?.()} aria-label={u.ariaLabel || (typeof u.text === "string" ? u.text : undefined)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", position: "relative",
                border: "none", color: "var(--decs-nav-text)", cursor: "pointer", "--hv-hover": "var(--decs-nav-hover-bg)",
                padding: "6px 10px", borderRadius: "var(--decs-radius-item)", fontFamily: "var(--decs-font-base)", fontSize: "var(--decs-fs-body-m)" }}>
              {u.iconName ? <Icon name={u.iconName} size={18} /> : null}
              {u.text && !(compact && u.iconName) ? <span>{u.text}</span> : null}
              {u.type === "menu" ? <Icon name="chevron-down" size={14} /> : null}
              {u.badge != null ? <span style={{ position: "absolute", top: "2px", right: "4px", minWidth: "16px", height: "16px", padding: "0 4px", boxSizing: "border-box", borderRadius: "9999px", background: "var(--decs-action-primary)", color: "var(--decs-text-on-color)", fontSize: "10px", fontWeight: "var(--decs-fw-bold)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{u.badge}</span> : null}
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
