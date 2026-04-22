import * as React from "react";

interface AdminSystemBroadcastEmailProps {
  subject: string;
  paragraphs: string[];
}

export function AdminSystemBroadcastEmail({
  subject,
  paragraphs,
}: Readonly<AdminSystemBroadcastEmailProps>) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: "#f5f5f4",
        padding: "32px 16px",
        color: "#1c1917",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #e7e5e4",
          borderRadius: "16px",
          padding: "32px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            lineHeight: "32px",
            fontWeight: 600,
            margin: "0 0 24px",
          }}
        >
          {subject}
        </h1>
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            style={{
              fontSize: "15px",
              lineHeight: "24px",
              margin: "0 0 16px",
              whiteSpace: "pre-wrap",
            }}
          >
            {paragraph}
          </p>
        ))}
        <p
          style={{
            fontSize: "12px",
            lineHeight: "18px",
            color: "#78716c",
            margin: "24px 0 0",
          }}
        >
          This is a system notification sent by an administrator.
        </p>
      </div>
    </div>
  );
}

export default AdminSystemBroadcastEmail;
