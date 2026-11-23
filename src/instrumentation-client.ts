import * as Sentry from "@sentry/nextjs";
import { MEDIA_STORAGE_DIAGNOSTIC_EVENT, sanitizeMediaStorageDiagnostic } from "@/lib/mediaStorageDiagnostics";
import { MEDIA_UPLOAD_DIAGNOSTIC_EVENT, sanitizeMediaUploadDiagnostic } from "@/lib/mediaUploadDiagnostics";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: process.env.NODE_ENV === "production",
  beforeSend(event) {
    if (event.tags?.found_upload_recovery_diagnostic === "1") {
      const diagnostic = sanitizeMediaUploadDiagnostic(event.contexts?.upload_recovery);
      if (!diagnostic) return null;
      return { type: undefined, event_id: event.event_id, timestamp: event.timestamp, platform: "javascript",
        level: "warning", message: "Found upload recovery waiting",
        tags: { found_upload_recovery_diagnostic: "1" }, contexts: { upload_recovery: diagnostic } };
    }
    if (event.tags?.found_device_storage_diagnostic !== "1") return event;
    const diagnostic = sanitizeMediaStorageDiagnostic(event.contexts?.device_storage);
    if (!diagnostic) return null;
    // This report is intentionally detached from screenshots, network
    // breadcrumbs, URLs, stack traces, cookies, user and account context.
    return { type: undefined, event_id: event.event_id, timestamp: event.timestamp, platform: "javascript",
      level: "warning", message: "Found device storage paused",
      tags: { found_device_storage_diagnostic: "1" }, contexts: { device_storage: diagnostic } };
  },
});

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  window.addEventListener(MEDIA_UPLOAD_DIAGNOSTIC_EVENT, event => {
    try {
      const diagnostic = sanitizeMediaUploadDiagnostic((event as CustomEvent).detail);
      if (diagnostic) Sentry.captureEvent({ level: "warning", message: "Found upload recovery waiting",
        tags: { found_upload_recovery_diagnostic: "1" }, contexts: { upload_recovery: diagnostic } });
    } catch { /* Reporting cannot interrupt media recovery. */ }
  });
  window.addEventListener(MEDIA_STORAGE_DIAGNOSTIC_EVENT, event => {
    const diagnostic = sanitizeMediaStorageDiagnostic((event as CustomEvent).detail);
    if (diagnostic) {
      try { Sentry.captureEvent({ level: "warning", message: "Found device storage paused",
        tags: { found_device_storage_diagnostic: "1" }, contexts: { device_storage: diagnostic } }); }
      catch { /* Reporting cannot interrupt media recovery. */ }
    }
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
