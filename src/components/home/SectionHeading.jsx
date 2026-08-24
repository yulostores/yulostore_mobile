import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma text style "type/h3" — Plus Jakarta Sans SemiBold 18 / 1.4, painted in
// semantic/text/tertiary (#999). Used for every "What's on your mind?"-style
// section label on the home feed.
export default function SectionHeading({ children, className }) {
  return (
    <Text className={cn("font-jakarta-semibold text-[18px] leading-[25px] text-[#999999]", className)}>
      {children}
    </Text>
  );
}
