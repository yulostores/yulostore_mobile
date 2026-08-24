import Card from "@/components/ui/Card";
import { sectionItems } from "@/data/menu";
import MenuSectionHeader from "./MenuSectionHeader";

// Neighbouring folded sections share one card, the way the design stacks
// Breads / Curry / Beverages together at the foot of the menu. Expanding any of
// them lifts it out into its own grid and the card closes back up around the
// rest.
export default function CollapsedSectionCard({ sections, onToggle }) {
  return (
    <Card className="w-full px-5 py-1">
      {sections.map((section) => (
        <MenuSectionHeader
          key={section.id}
          title={section.title}
          itemCount={sectionItems(section).length}
          expanded={false}
          className="py-4"
          onPress={() => onToggle?.(section.id)}
        />
      ))}
    </Card>
  );
}
