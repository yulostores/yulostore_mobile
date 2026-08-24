import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import PressableScale from "@/components/ui/PressableScale";
import { PRESS_SCALE } from "@/lib/motion";

export default function BackButton({ className, size = 18 }) {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;

  return (
    <PressableScale
      onPress={() => navigation.goBack()}
      scale={PRESS_SCALE.tight}
      accessibilityLabel="Go back"
      className={className || "size-10 items-center justify-center rounded-full bg-muted"}
    >
      <ArrowLeft size={size} color="#1a1a1a" />
    </PressableScale>
  );
}
