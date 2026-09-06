import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma text style "type/h3", in semantic/text/tertiary. Used for every
// "What's on your mind?"-style section label on the home feed.
export default function SectionHeading({ children, className }) {
  return (
    <Text className={cn("font-jakarta-semibold text-[18px] leading-[25px] text-muted-placeholder", className)}>
      {children}
    </Text>
  );
}
