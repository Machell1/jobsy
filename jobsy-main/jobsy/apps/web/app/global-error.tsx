"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <div
              style={{
                fontSize: "4rem",
                fontWeight: "bold",
                color: "#DC2626",
                marginBottom: "1rem",
              }}
            >
              500
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "0.5rem",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: "#6B7280",
                marginBottom: "2rem",
                lineHeight: "1.5",
              }}
            >
              We hit an unexpected error. Our team has been notified. Please try
              again.
              {error.digest && (
                <span style={{ display: "block", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                  Error ID: {error.digest}
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#1A56DB",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "1px solid #D1D5DB",
                  color: "#374151",
                  borderRadius: "0.5rem",
                  fontWeight: "500",
                  textDecoration: "none",
                  fontSize: "1rem",
                }}
              >
                Go Home
              </a>
            </div>
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#9CA3AF" }}>
              Need help?{" "}
              <a href="mailto:support@jobsyja.com" style={{ color: "#1A56DB" }}>
                support@jobsyja.com
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
