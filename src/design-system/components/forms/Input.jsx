import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Input — single-line text/number input matching Cloudscape. Set `invalid` to
 * show the error border (pair with FormField errorText). Optional leading icon.
 */
export function Input({ value, onChange, placeholder, type = "text", disabled, invalid, readOnly, iconName, id, ariaLabel, onKeyDown, style }) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = invalid
    ? "var(--decs-status-error)"
    : focus
    ? "var(--decs-border-focus)"
    : "var(--decs-border-input)";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", ...style }}>
      {iconName ? (
        <span style={{ position: "absolute", left: "var(--decs-space-s)", color: "var(--decs-text-secondary)", display: "inline-flex", pointerEvents: "none" }}>
          <Icon name={iconName} size={16} />
        </span>
      ) : null}
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onKeyDown={onKeyDown}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => onChange?.(e.target.value, e)}
        style={{
          width: "100%",
          fontFamily: "var(--decs-font-base)",
          fontSize: "var(--decs-fs-body-m)",
          lineHeight: "var(--decs-lh-body-m)",
          color: "var(--decs-text-body)",
          background: disabled ? "var(--decs-surface-disabled)" : "var(--decs-surface-input)",
          border: `1px solid ${borderColor}`,
          boxShadow: focus ? "0 0 0 1px var(--decs-border-focus)" : "none",
          outline: "none",
          borderRadius: "var(--decs-radius-input)",
          padding: iconName ? "var(--decs-space-xs) var(--decs-space-m) var(--decs-space-xs) var(--decs-space-xxxl)" : "var(--decs-space-xs) var(--decs-space-m)",
          minHeight: "var(--decs-control-height)",
          boxSizing: "border-box",
          transition: "border-color var(--decs-motion-fast) var(--decs-easing)",
        }}
      />
    </div>
  );
}
