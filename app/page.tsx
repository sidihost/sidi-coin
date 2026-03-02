"use client";

import { useState } from "react";

const gold = "#C8942A";
const navy = "#1B2A4A";
const cream = "#F7F5F0";
const cardBg = "#FFFFFF";
const mutedText = "#7A7668";
const borderColor = "#E8E4DC";

function DownloadButton({ href, filename }: { href: string; filename: string }) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 24px",
        borderRadius: "10px",
        border: "none",
        background: gold,
        color: "#FFFFFF",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 0.2s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {downloaded ? "Downloaded" : "Download"}
    </button>
  );
}

function ViewButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 24px",
        borderRadius: "10px",
        border: `1.5px solid ${borderColor}`,
        background: "transparent",
        color: navy,
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "none",
        transition: "background 0.2s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F0ECE4")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      Full Size
    </a>
  );
}

function AssetCard({
  title,
  description,
  src,
  filename,
  tag,
}: {
  title: string;
  description: string;
  src: string;
  filename: string;
  tag: string;
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1px solid ${borderColor}`,
        background: cardBg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#EFEBE3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <img
          src={src}
          alt={title}
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "400px",
            objectFit: "contain",
            borderRadius: "10px",
          }}
        />
      </div>
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: navy, margin: 0 }}>{title}</h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "6px",
                background: `${gold}18`,
                color: gold,
                letterSpacing: "0.5px",
              }}
            >
              {tag}
            </span>
          </div>
          <p style={{ fontSize: "14px", color: mutedText, lineHeight: 1.6, margin: 0 }}>
            {description}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <DownloadButton href={src} filename={filename} />
          <ViewButton href={src} />
        </div>
      </div>
    </div>
  );
}

export default function BrandAssetsPage() {
  return (
    <main style={{ minHeight: "100vh", background: cream }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 24px" }}>
        <header style={{ textAlign: "center", marginBottom: "64px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "999px",
              background: `${gold}15`,
              color: gold,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "1.5px",
              border: `1px solid ${gold}30`,
              marginBottom: "24px",
            }}
          >
            BRAND ASSETS
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 800,
              color: navy,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              margin: "0 0 16px 0",
            }}
          >
            Sidicoin Brand Kit
          </h1>
          <p
            style={{
              color: mutedText,
              fontSize: "18px",
              lineHeight: 1.6,
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            Download the official Sidicoin logo and welcome banner. High-resolution assets ready for
            Telegram, social media and your website.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          <AssetCard
            title="Main Coin Logo"
            description="The iconic 3D golden SIDI coin on a clean white background. Perfect for websites, documents, presentations, and any light-background usage."
            src="/images/sidicoin-logo-main.jpg"
            filename="sidicoin-logo-main.jpg"
            tag="WHITE BG"
          />

          <AssetCard
            title="Full Logo"
            description="The golden SIDI coin with SIDICOIN typography on premium dark navy. Ideal for social media headers, promotional material, and dark-themed platforms."
            src="/images/sidicoin-logo-dark.jpg"
            filename="sidicoin-logo-dark.jpg"
            tag="NAVY BG"
          />

          <AssetCard
            title="Telegram Profile Logo"
            description="Bold, minimal golden S coin optimized for small profile sizes. Use this as your Telegram bot profile picture, social media avatar, and app icon."
            src="/images/sidicoin-logo-telegram.jpg"
            filename="sidicoin-logo-telegram.jpg"
            tag="SQUARE"
          />

          <AssetCard
            title="Welcome Banner"
            description="Cinematic wide-format banner with the 3D golden coin, SIDICOIN branding, and Africa's Digital Currency tagline. Use for Telegram channel headers and Twitter/X banners."
            src="/images/sidicoin-banner-v2.jpg"
            filename="sidicoin-banner-v2.jpg"
            tag="WIDE"
          />
        </div>

        <footer style={{ marginTop: "80px", textAlign: "center" }}>
          <div style={{ height: "1px", background: borderColor, marginBottom: "32px" }} />
          <p style={{ fontSize: "14px", color: mutedText }}>
            Sidicoin -- Instant Money Transfers Across Africa
          </p>
          <p style={{ fontSize: "12px", color: mutedText, marginTop: "8px", opacity: 0.7 }}>
            Built on TON Blockchain
          </p>
        </footer>
      </div>
    </main>
  );
}
