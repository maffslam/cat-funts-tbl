// ============================================================
// Share Buttons – WhatsApp + Copy to Clipboard
// ============================================================

import { useState } from "react";
import { S, COLOURS } from "../styles.js";

export default function ShareButtons({ message, label = "Share", whatsappLabel, copyLabel }) {
  const [copied, setCopied] = useState(false);

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      <button
        style={{
          ...S.btnWhatsApp,
          flex: 1,
          marginBottom: 0,
          fontSize: 12,
          padding: "12px 8px",
        }}
        onClick={shareToWhatsApp}
      >
        📱 {whatsappLabel || label}
      </button>
      <button
        style={{
          ...S.btnSecondary,
          flex: 1,
          marginBottom: 0,
          fontSize: 12,
          padding: "12px 8px",
          color: copied ? COLOURS.green : COLOURS.primary,
          borderColor: copied ? COLOURS.green : COLOURS.primary,
        }}
        onClick={copyToClipboard}
      >
        {copied ? "✓ Copied!" : `📋 ${copyLabel || "Copy"}`}
      </button>
    </div>
  );
}
