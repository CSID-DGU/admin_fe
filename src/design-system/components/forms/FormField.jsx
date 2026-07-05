import React from "react";

/**
 * FormField — label + description + control + constraint/error wrapper.
 * Wrap every Input/Select so labels, help text and validation are consistent.
 */
export function FormField({ label, description, constraintText, errorText, secondaryControl, children, htmlFor, style }) {
  const invalid = !!errorText;
  return (
    <div style={{ fontFamily: "var(--decs-font-base)", ...style }}>
      {label ? (
        <label htmlFor={htmlFor} style={{ display: "block", fontSize: "var(--decs-fs-body-m)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", marginBottom: description ? "2px" : "var(--decs-space-xxs)" }}>
          {label}
        </label>
      ) : null}
      {description ? (
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginBottom: "var(--decs-space-xxs)" }}>{description}</div>
      ) : null}
      <div style={{ display: "flex", gap: "var(--decs-space-xs)", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        {secondaryControl ? <div>{secondaryControl}</div> : null}
      </div>
      {invalid ? (
        <div role="alert" style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-status-error)", marginTop: "var(--decs-space-xxs)" }}>{errorText}</div>
      ) : constraintText ? (
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginTop: "var(--decs-space-xxs)" }}>{constraintText}</div>
      ) : null}
    </div>
  );
}
