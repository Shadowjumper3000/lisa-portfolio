import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Handles two things:
// - Reset scroll to top when navigating to certain routes (e.g. /gallery)
// - Scroll to an element when the location contains a hash (e.g. /#contact)
export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    // If navigating to gallery, ensure we start at the top
    if (location.pathname === "/gallery") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    // If there's a hash, attempt to scroll to the element with that id
    if (location.hash) {
      const id = location.hash.replace("#", "");

      // Try to find the element; it might not be in the DOM immediately after navigation.
      // Keep trying for a short while until found, then scroll to it.
      let attempts = 0;
      const maxAttempts = 20;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return;
        }
        attempts += 1;
        if (attempts < maxAttempts) {
          requestAnimationFrame(tryScroll);
        }
      };

      // Use setTimeout to allow initial render paint, then start trying
      setTimeout(tryScroll, 0);
    }
  }, [location.pathname, location.hash]);

  return null;
}
