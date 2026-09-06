import { isValidElement } from "react";
import { cva } from "class-variance-authority";

import { colors } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import PressableScale from "./PressableScale";
import Text from "./Text";

const containerVariants = cva("items-center justify-center rounded-full flex-row gap-2", {
  variants: {
    variant: {
      default: "bg-primary",
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

// A drop shadow is the one thing the variants can't express as a class:
// NativeWind's shadow utilities don't map onto RN's iOS shadow* / Android
// elevation pair, so the primary button's glow is a style. Its colour still
// comes from the same token the `bg-primary` class above resolves to.
const PRIMARY_SHADOW = {
  shadowColor: colors.primary.DEFAULT,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 5,
};

export default function Button({
  children,
  variant,
  size,
  disabled,
  className,
  textClassName,
  onPress,
  style,
  ...props
}) {
  const effectiveVariant = disabled && variant !== "disabled" ? "disabled" : variant;

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
      {...props}
      style={[effectiveVariant === "default" && PRIMARY_SHADOW, style]}
    >
      {isValidElement(children) ? (
        children
      ) : (
        // Covers plain strings AND interpolated JSX (e.g. `Continue {n}`,
        // which arrives as an array of nodes, not a single string) — RN
        // throws if a bare text node is a direct child of a View/Pressable,
        // so anything that isn't already a real element gets wrapped here.
        <Text className={cn(textVariants({ variant: effectiveVariant, size }), textClassName)}>
          {children}
        </Text>
      )}
    </PressableScale>
  );
}
