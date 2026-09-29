import type { ButtonHTMLAttributes } from "react";
import { withUiSounds } from "../audio/uiSounds";
import { pngAsset } from "../utils/assets";

export type RoundIcon = "minus" | "plus" | "turn_left" | "turn_right";

interface RoundButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: RoundIcon;
  label: string;
}

export function RoundButton({
  icon,
  label,
  type = "button",
  ...rest
}: RoundButtonProps) {
  const image = pngAsset(`ui/controls/icon_${icon}.png`);
  return (
    <button
      type={type}
      className="round-button"
      aria-label={label}
      {...withUiSounds(rest)}
    >
      <img
        className="round-button__icon"
        src={image.src}
        srcSet={image.srcSet}
        alt=""
        draggable={false}
      />
    </button>
  );
}
