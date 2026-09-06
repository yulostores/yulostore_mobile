import { useEffect, useState } from "react";

// A request that is merely slow looks exactly like a request that is never coming
// back: the same spinner, in the same place, saying the same nothing. Reads time
// out at 10s (src/api/client.js) and the retry policy in queryClient.js allows two
// attempts with backoff behind that, so a customer on a bad connection can be
// looking at an unchanged spinner for a good deal longer than they are willing to
// wait without being told anything at all.
//
// Four seconds is past the tail of a healthy request on 4G and well short of the
// first timeout, so the notice lands while the request is still genuinely in
// flight — it says "still trying", which is true, rather than pre-announcing a
// failure that usually doesn't happen.
export const SLOW_REQUEST_MS = 4000;

export function useSlowRequest(active, delay = SLOW_REQUEST_MS) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    const timer = setTimeout(() => setSlow(true), delay);

    // Cleared on the way out rather than on the way in, so a second wait — a
    // retry, or a screen that loads again — starts from "not slow yet" instead of
    // inheriting the last one's verdict.
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, delay]);

  return active && slow;
}
