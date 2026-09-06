import { useState } from "react";
import { Image, View } from "react-native";
import { Utensils } from "lucide-react-native";
import { colors } from "@/lib/tokens";

// RN's Image renders nothing when a remote `uri` 404s or times out — no
// built-in fallback the way a web `<img>` gets one via onError + a swapped
// src. A dish photo missing from the CDN (or a slow/flaky connection) was
// leaving a blank box instead of the placeholder the card was designed around.
//
// There are two ways a photo can be absent and both end up here: the record
// carries no image at all (`source` is null), or a remote one failed to load.
// Callers used to have to hand in a photographic `fallback` bitmap for the
// second case, which is how two stock JPEG-ish PNGs of a biryani ended up
// shipping in the bundle as stand-ins for dishes nobody had photographed. The
// tinted tile below is the same fallback `MenuItemCard` already draws for a
// null image — a muted ground and one vector glyph, costing nothing over the
// lucide set the app already bundles — so a missing photo needs no bitmap.
//
// `fallback` is still honoured for the callers that genuinely have a branded
// stand-in worth showing (a restaurant avatar, a category tile).
const FALLBACK_TINT = colors.muted.placeholder;

export default function RemoteImage({
  source,
  fallback,
  icon: Icon = Utensils,
  iconSize = 28,
  style,
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const isRemote = !!source?.uri;
  const resolved = isRemote && failed ? fallback : source;

  // Keeps the card's shape instead of collapsing the row it sits in.
  if (!resolved) {
    return (
      <View style={style} className="items-center justify-center bg-muted">
        <Icon size={iconSize} color={FALLBACK_TINT} />
      </View>
    );
  }

  return (
    <Image
      source={resolved}
      onError={isRemote ? () => setFailed(true) : undefined}
      style={style}
      {...props}
    />
  );
}
