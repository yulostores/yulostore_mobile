import { isValidElement } from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import PressableScale from "./PressableScale";
import Text from "./Text";

const containerVariants = cva("items-center justify-center rounded-full flex-row gap-2", {
  variants: {
    variant: {
      default: "bg-primary", // Removed shadow utilities to prevent NativeWind crash
      secondary: "bg-white border-[1.5px] border-primary-hover",
      ghost: "bg-transparent",
      destructive: "bg-destructive",
      disabled: "bg-border-strong",
    },
    size: {
      default: "h-12 px-6",
      sm: "h-10 px-6",
      lg: "h-14 px-8",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const textVariants = cva("font-jakarta-semibold text-center", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-primary-hover",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
      disabled: "text-muted-foreground",
    },
    size: {
      default: "text-[14px]",
      sm: "text-[14px]",
      lg: "text-base",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

// Same colors as the Tailwind tokens above (hsl(var(--primary)) etc, see
// global.css), duplicated here as inline styles. NativeWind resolves
// `className` into RN styles at runtime, but PressableScale's container is a
// Reanimated `Animated.createAnimatedComponent(Pressable)` registered via a
// manual `cssInterop(..., { className: "style" })` — on native (not web,
// which uses real CSS) that combination doesn't reliably repaint the
// class-driven background/text colors when `variant`/`disabled` changes, so
// the button can get stuck showing its initial color. `style` bypasses that
// pipeline entirely — RN applies it directly — so it renders identically on
// both platforms regardless of that bug.
const VARIANT_COLORS = {
  default: { bg: "#FF5E00", text: "#FFFFFF" },
  secondary: { bg: "#FFFFFF", text: "#F05728", borderColor: "#F05728" },
  ghost: { bg: "transparent", text: "#1A1A1A" },
  destructive: { bg: "#E53734", text: "#FFFFFF" },
  disabled: { bg: "#D6D6D6", text: "#666666" },
};

export default function Button({
  children,
  variant,
  size,
  disabled,
  className,
  textClassName,
  onPress,
  ...props
}) {
  const effectiveVariant = disabled && variant !== "disabled" ? "disabled" : variant;
  const colors = VARIANT_COLORS[effectiveVariant ?? "default"];

  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      // A disabled button is already drawn as unavailable; dimming it further on
      // touch would suggest the tap did something.
      dimTo={disabled ? 1 : 0.9}
      className={cn(
        containerVariants({ variant: effectiveVariant, size }),
        disabled && "opacity-100",
        className,
      )}
      style={[
        {
          backgroundColor: colors.bg,
          ...(colors.borderColor ? { borderColor: colors.borderColor } : null),
        },
        effectiveVariant === "default" && {
          shadowColor: "#FF5E00",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 6,
          elevation: 5
        },
        props.style
      ]}
      {...props}
    >
      {isValidElement(children) ? (
        children
      ) : (
        // Covers plain strings AND interpolated JSX (e.g. `Continue {n}`,
        // which arrives as an array of nodes, not a single string) — RN
        // throws if a bare text node is a direct child of a View/Pressable,
        // so anything that isn't already a real element gets wrapped here.
        <Text
          className={cn(textVariants({ variant: effectiveVariant, size }), textClassName)}
          style={{ color: colors.text }}
        >
          {children}
        </Text>
      )}
    </PressableScale>
  );
}
