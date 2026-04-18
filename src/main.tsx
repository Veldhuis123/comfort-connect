import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://0f3334e10ba0ad4dd50abdb05008bca2@o4511241297395712.ingest.de.sentry.io/4511241302966352",
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
  // Filter noise: don't report dev-only errors or known browser extension issues
  beforeSend(event, hint) {
    if (import.meta.env.DEV) return null;
    return event;
  },
});

createRoot(document.getElementById("root")!).render(<App />);
