import type { Ref, RefCallback } from "react";

/**
 * Combine multiple React refs into a single callback ref.
 *
 * Handles function refs, object refs, null, and undefined.
 * Forwards `null` to all refs on cleanup (unmount).
 */
export function mergeRefs<T>(
  ...refs: (Ref<T> | undefined | null)[]
): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}
