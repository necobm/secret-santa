import type { ComponentProps } from "react";

// Raised buttons from the design spec: a solid shadow underneath that "sinks" when pressed.
// Explicit variants instead of boolean props; for links, use the classes in `button`.

const base =
  "inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-button px-5 text-[17px] font-black transition-transform active:translate-y-[3px] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0";

export const button = {
  primary: `${base} bg-accent text-white shadow-button active:shadow-[0_2px_0_var(--color-accent-shade)]`,
  secondary: `${base} border-2 border-border bg-surface text-ink shadow-button-neutral active:shadow-[0_2px_0_var(--color-border)]`,
  danger: `${base} bg-danger text-white shadow-button-danger active:shadow-[0_2px_0_var(--color-danger-shade)]`,
  dark: `${base} bg-ink text-white shadow-[0_5px_0_#000] active:shadow-[0_2px_0_#000]`,
  /** On a green background. */
  white: `${base} bg-white text-accent shadow-button active:shadow-[0_2px_0_var(--color-accent-shade)]`,
} as const;

type Props = ComponentProps<"button">;
const withStyle = (style: string) =>
  function Button({ className = "", type = "button", ...props }: Props) {
    return <button type={type} className={`${style} ${className}`} {...props} />;
  };

export const PrimaryButton = withStyle(button.primary);
export const SecondaryButton = withStyle(button.secondary);
export const DangerButton = withStyle(button.danger);
export const DarkButton = withStyle(button.dark);
export const WhiteButton = withStyle(button.white);

/** Square button with only an icon (always has an aria-label). */
export function IconButton({ className = "", ...props }: Props & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={`inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-field border-2 border-border bg-surface text-muted shadow-[0_3px_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-border)] ${className}`}
      {...props}
    />
  );
}
