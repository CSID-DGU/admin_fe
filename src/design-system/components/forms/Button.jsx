import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Button — Cloudscape button. In DECS the `primary` variant carries the brand
 * accent (orange), which is the main thing that makes DECS look like DECS.
 * Variants: primary | normal | link | inline-link | icon.
 */
function useHover() {
  const [h, setH] = React.useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) }];
}

export function Button({
  variant = "normal",
  children,
  iconName,
  iconAlign = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  href,
  ariaLabel,
  style,
}) {
  const [hover, hoverProps] = useHover();
  const isDisabled = disabled || loading;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--decs-space-xs)",
    fontFamily: "var(--decs-font-base)",
    fontSize: "var(--decs-fs-body-m)",
    lineHeight: "var(--decs-lh-body-m)",
    fontWeight: "var(--decs-fw-bold)",
    borderRadius: "var(--decs-radius-button)",
    cursor: isDisabled ? "default" : "pointer",
    border: "1px solid transparent",
    padding: "4px 20px",
    minHeight: "32px",
    width: fullWidth ? "100%" : undefined,
    transition: "background var(--decs-motion-fast) var(--decs-easing), border-color var(--decs-motion-fast) var(--decs-easing)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const variants = {
    primary: {
      background: isDisabled ? "var(--decs-grey-200)" : hover ? "var(--decs-action-primary-hover)" : "var(--decs-action-primary)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-action-primary-text)",
    },
    normal: {
      background: isDisabled ? "transparent" : hover ? "var(--decs-action-normal-hover-bg)" : "var(--decs-action-normal-bg)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-action-normal-text)",
      borderColor: isDisabled ? "var(--decs-grey-300)" : "var(--decs-action-normal-border)",
    },
    link: {
      background: hover && !isDisabled ? "var(--decs-action-normal-hover-bg)" : "transparent",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-link)",
    },
    "inline-link": {
      background: "transparent",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-link)",
      padding: 0,
      minHeight: 0,
      borderRadius: 0,
      fontWeight: "var(--decs-fw-regular)",
      textDecoration: hover && !isDisabled ? "underline" : "none",
    },
    icon: {
      background: hover && !isDisabled ? "var(--decs-surface-hover)" : "transparent",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-secondary)",
      padding: "6px",
      minHeight: 0,
      borderRadius: "var(--decs-radius-item)",
    },
  };

  const merged = { ...base, ...(variants[variant] || variants.normal), ...style };
  const Tag = href && !isDisabled ? "a" : "button";
  const icon = loading ? (
    <span style={{ display: "inline-flex", animation: "decs-spin 1s linear infinite" }}><Icon name="arrow-path" size={16} /></span>
  ) : iconName ? <Icon name={iconName} size={16} /> : null;

  return (
    <Tag
      {...hoverProps}
      href={href && !isDisabled ? href : undefined}
      onClick={isDisabled ? undefined : onClick}
      disabled={Tag === "button" ? isDisabled : undefined}
      aria-label={ariaLabel}
      aria-disabled={isDisabled || undefined}
      style={merged}
    >
      {iconAlign === "left" && icon}
      {variant === "icon" && !children ? null : children}
      {iconAlign === "right" && icon}
      <style>{"@keyframes decs-spin{to{transform:rotate(360deg)}}"}</style>
    </Tag>
  );
}
