/**
 * @fileoverview Responsive media query hook with a resize fallback for tests.
 */
import { useEffect, useState } from "react";

function evaluateFallback(query) {
  if (typeof window === "undefined") {
    return false;
  }

  const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
  const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);

  let matches = true;

  if (minWidthMatch) {
    matches = matches && window.innerWidth >= Number(minWidthMatch[1]);
  }

  if (maxWidthMatch) {
    matches = matches && window.innerWidth <= Number(maxWidthMatch[1]);
  }

  return matches;
}

function getMatches(query) {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia(query).matches;
  }

  return evaluateFallback(query);
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => getMatches(query));

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (typeof window.matchMedia === "function") {
      const mediaQueryList = window.matchMedia(query);
      const handleChange = (event) => setMatches(event.matches);

      setMatches(mediaQueryList.matches);
      mediaQueryList.addEventListener("change", handleChange);

      return () => {
        mediaQueryList.removeEventListener("change", handleChange);
      };
    }

    const handleResize = () => {
      setMatches(evaluateFallback(query));
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [query]);

  return matches;
}
