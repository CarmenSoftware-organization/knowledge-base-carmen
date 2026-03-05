"use client";

import { useEffect } from "react";

export default function FloatingChatBot() {
  useEffect(() => {
    // Prevent adding multiple script tags if strict mode double-invokes
    if (document.querySelector('script[src="/carmen-widget.js"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "/carmen-widget.js";
    script.async = true;
    
    // Pass configuration parameters as required by the widget
    script.setAttribute("data-bu", "global");
    script.setAttribute("data-user", "Guest"); // Or dynamically set based on auth wrapper
    
    // Point to the backend API base url
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    script.setAttribute("data-api-base", apiBaseUrl);

    document.body.appendChild(script);

    return () => {
      // Optional: Cleanup script from body if component unmounts
      // though typically this stays around during the lifecycle of the app
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}
