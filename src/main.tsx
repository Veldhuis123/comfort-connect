import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Init Sentry zonder Replay (Replay = ~50KB). Replay laadt pas na idle voor lagere TBT.
Sentry.init({
  dsn: "https://0f3334e10ba0ad4dd50abdb05008bca2@o4511241297395712.ingest.de.sentry.io/4511241302966352",
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
  beforeSend(event) {
    if (import.meta.env.DEV) return null;
    return event;
  },
});

// Lazy-add Replay integration when the browser is idle, zodat de hoofdthread vrij blijft tijdens LCP.
if (typeof window !== "undefined" && !import.meta.env.DEV) {
  const loadReplay = () => {
    import("@sentry/react").then((S) => {
      try {
        const client = S.getClient();
        if (!client) return;
        const replay = S.replayIntegration({ maskAllText: false, blockAllMedia: false });
        client.addIntegration(replay);
      } catch {
        /* noop */
      }
    });
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(loadReplay, { timeout: 5000 });
  } else {
    setTimeout(loadReplay, 4000);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
