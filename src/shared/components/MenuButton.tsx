import type { ComponentPropsWithRef } from "react";
import { withUiSounds } from "../audio/uiSounds";

interface MenuButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary";
  size?: "lg" | "sm";
}

export function MenuButton({
  variant = "primary",
  size = "lg",
  className,
  type = "button",
  ...rest
}: MenuButtonProps) {
  const classes = [
    "menu-button",
    `menu-button--${variant}`,
    `menu-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      className={classes}
      data-autofocus={rest.autoFocus || undefined}
      {...withUiSounds(rest)}
    />
  );
}
