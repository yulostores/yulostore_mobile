import { useState } from "react";
import { Image } from "react-native";

// RN's Image renders nothing when a remote `uri` 404s or times out — no
// built-in fallback the way a web `<img>` gets one via onError + a swapped
// src. A dish photo missing from the CDN (or a slow/flaky connection) was
// leaving a blank box instead of the local placeholder the card was designed
// around. This swaps to `fallback` once the remote load fails; local
// `require(...)` sources never carry a `uri` so they're rendered as-is.
export default function RemoteImage({ source, fallback, ...props }) {
  const [failed, setFailed] = useState(false);
  const isRemote = !!source?.uri;

  return (
    <Image
      source={isRemote && failed ? fallback : source}
      onError={isRemote ? () => setFailed(true) : undefined}
      {...props}
    />
  );
}
