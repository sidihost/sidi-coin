"use client";

import { useRef, useCallback, useState } from "react";

const gold = "#C8942A";
const goldLight = "#E2B94E";
const goldDark = "#9A6F1C";
const navy = "#1B2A4A";
const navyLight = "#2A3F6A";
const cream = "#F7F5F0";
const white = "#FFFFFF";
const mutedText = "#7A7668";
const borderColor = "#E8E4DC";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SVG LOGO COMPONENT — Dogecoin-Style Sidicoin "S" Coin
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SidicoinLogo({ size = 300, glyphColor = "white" }: { size?: number; glyphColor?: "white" | "navy" }) {
  const isWhite = glyphColor === "white";
  const charFill = isWhite ? white : navy;
  const strokeColor = isWhite ? navy : goldDark;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer coin border - solid dark gold rim */}
      <circle cx="200" cy="200" r="190" fill={goldDark} />

      {/* Main coin face - vibrant solid coin gold */}
      <circle cx="200" cy="200" r="176" fill={gold} />

      {/* Milled coin edge notches - 36 precision minted markers */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10 * Math.PI) / 180;
        const x1 = 200 + 175 * Math.cos(angle);
        const y1 = 200 + 175 * Math.sin(angle);
        const x2 = 200 + 165 * Math.cos(angle);
        const y2 = 200 + 165 * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={goldDark}
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}

      {/* Inner concentric circular frame ring */}
      <circle cx="200" cy="200" r="156" fill="none" stroke={strokeColor} strokeWidth="4" />
      <circle cx="200" cy="200" r="148" fill="none" stroke={strokeColor} strokeWidth="1.5" />

      {/* Central Currency Glyphs - The iconic Sidicoin S with Dogecoin-style currency crossbar */}
      {/* Crossbar piercing cleanly through the center waist */}
      <rect
        x="108"
        y="190"
        width="184"
        height="20"
        rx="10"
        fill={strokeColor === navy ? navy : charFill}
      />
      {isWhite && (
        <rect
          x="112"
          y="193"
          width="176"
          height="14"
          rx="7"
          fill={charFill}
        />
      )}

      {/* Bold S Lettermark */}
      <text
        x="200"
        y="256"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', -apple-system, sans-serif"
        fontSize="196"
        fontWeight="900"
        letterSpacing="-4"
        fill={charFill}
        stroke={strokeColor}
        strokeWidth={isWhite ? "8" : "0"}
        paintOrder="stroke fill"
      >
        S
      </text>

      {/* Sharp inner crossbar accent */}
      <rect
        x="122"
        y="194"
        width="156"
        height="12"
        rx="6"
        fill={charFill}
      />
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FULL LOGO WITH TEXT — Dogecoin-Style Full Lockup
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SidicoinFullLogo({ width = 600, dark = false }: { width?: number; dark?: boolean }) {
  const bg = dark ? navy : "transparent";
  const textColor = dark ? white : navy;
  const subColor = dark ? goldLight : goldDark;

  return (
    <svg
      width={width}
      height={width * 0.55}
      viewBox="0 0 600 330"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {dark && <rect width="600" height="330" rx="20" fill={bg} />}

      {/* Coin Icon */}
      <g transform="translate(300, 115)">
        {/* Outer coin border */}
        <circle r="96" fill={goldDark} />

        {/* Main coin face */}
        <circle r="89" fill={gold} />

        {/* Milled coin edge notches */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const x1 = 88 * Math.cos(angle);
          const y1 = 88 * Math.sin(angle);
          const x2 = 82 * Math.cos(angle);
          const y2 = 82 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={goldDark}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Inner concentric ring */}
        <circle r="78" fill="none" stroke={navy} strokeWidth="2.5" />
        <circle r="74" fill="none" stroke={navy} strokeWidth="1" />

        {/* Crossbar */}
        <rect x="-50" y="-5" width="100" height="10" rx="5" fill={white} stroke={navy} strokeWidth="3" paintOrder="stroke fill" />

        {/* S glyph */}
        <text
          y="31"
          textAnchor="middle"
          fontFamily="Impact, 'Arial Black', -apple-system, sans-serif"
          fontSize="102"
          fontWeight="900"
          letterSpacing="-2"
          fill={white}
          stroke={navy}
          strokeWidth="6"
          paintOrder="stroke fill"
        >
          S
        </text>

        {/* Center bar highlight */}
        <rect x="-42" y="-3" width="84" height="6" rx="3" fill={white} />
      </g>

      {/* Text */}
      <text
        x="300"
        y="266"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="44"
        fontWeight="900"
        letterSpacing="8"
        fill={textColor}
      >
        SIDICOIN
      </text>
      <text
        x="300"
        y="298"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="5"
        fill={subColor}
      >
        AFRICA'S DIGITAL CURRENCY
      </text>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TELEGRAM WELCOME BANNER — Flat Dogecoin-Inspired
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function WelcomeBanner({ width = 800 }: { width?: number }) {
  const h = width * 0.45;
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 800 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Solid deep navy background */}
      <rect width="800" height="360" rx="16" fill={navy} />

      {/* Decorative solid corner badges */}
      <rect x="0" y="0" width="800" height="6" fill={gold} />
      <rect x="0" y="354" width="800" height="6" fill={gold} />

      {/* Coin Icon */}
      <g transform="translate(190, 180)">
        <circle r="105" fill={goldDark} />
        <circle r="97" fill={gold} />

        {/* Milled coin edge notches */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const x1 = 96 * Math.cos(angle);
          const y1 = 96 * Math.sin(angle);
          const x2 = 90 * Math.cos(angle);
          const y2 = 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={goldDark}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Inset concentric circles */}
        <circle r="85" fill="none" stroke={navy} strokeWidth="3" />
        <circle r="80" fill="none" stroke={navy} strokeWidth="1" />

        {/* Crossbar */}
        <rect x="-56" y="-6" width="112" height="12" rx="6" fill={white} stroke={navy} strokeWidth="4" paintOrder="stroke fill" />

        {/* S symbol */}
        <text
          y="35"
          textAnchor="middle"
          fontFamily="Impact, 'Arial Black', -apple-system, sans-serif"
          fontSize="114"
          fontWeight="900"
          letterSpacing="-3"
          fill={white}
          stroke={navy}
          strokeWidth="7"
          paintOrder="stroke fill"
        >
          S
        </text>

        <rect x="-46" y="-4" width="92" height="8" rx="4" fill={white} />
      </g>

      {/* Welcome text */}
      <text
        x="520"
        y="118"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="6"
        fill={goldLight}
      >
        WELCOME TO
      </text>
      <text
        x="520"
        y="176"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="54"
        fontWeight="900"
        letterSpacing="4"
        fill={white}
      >
        SIDICOIN
      </text>

      {/* Solid gold divider bar */}
      <rect x="420" y="196" width="200" height="4" rx="2" fill={gold} />

      {/* Tagline */}
      <text
        x="520"
        y="235"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="3"
        fill={goldLight}
      >
        INSTANT MONEY TRANSFERS
      </text>
      <text
        x="520"
        y="262"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="3"
        fill={goldLight}
      >
        ACROSS AFRICA
      </text>

      {/* TON badge */}
      <rect x="465" y="288" width="110" height="28" rx="14" fill={white} fillOpacity="0.15" />
      <text
        x="520"
        y="306"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2.5"
        fill={white}
      >
        ON TON
      </text>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DOWNLOAD UTILITY — SVG to PNG at any resolution
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function useSvgDownload() {
  return useCallback(
    (svgElement: SVGSVGElement | null, filename: string, scale: number = 4) => {
      if (!svgElement) return;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        }, "image/png");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    []
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ASSET CARD WITH SVG PREVIEW + PNG DOWNLOAD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SvgAssetCard({
  title,
  description,
  tag,
  filename,
  bgColor,
  children,
}: {
  title: string;
  description: string;
  tag: string;
  filename: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const downloadPng = useSvgDownload();
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const svg = svgRef.current?.querySelector?.("svg") || svgRef.current;
    if (svgRef.current) {
      const inner = svgRef.current.querySelector("svg");
      downloadPng(inner || svgRef.current as unknown as SVGSVGElement, filename, 4);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    }
  };

  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1px solid ${borderColor}`,
        background: white,
        overflow: "hidden",
      }}
    >
      <div
        ref={svgRef as React.RefObject<HTMLDivElement>}
        style={{
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        {children}
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
        <button
          onClick={handleDownload}
          style={{
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: "8px",
            padding: "12px 28px",
            borderRadius: "10px",
            border: "none",
            background: gold,
            color: white,
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.2s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {downloaded ? "Downloaded as PNG" : "Download High-Res PNG"}
        </button>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PAGE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function BrandAssetsPage() {
  return (
    <main style={{ minHeight: "100vh", background: cream }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "64px 24px" }}>
        {/* Header */}
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
            Official Sidicoin logos and banners, built with code for pixel-perfect quality at any size.
            Every download renders at 4x resolution.
          </p>
        </header>

        {/* Assets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* 1. Icon Logo (White Glyph - Dogecoin Edition) */}
          <SvgAssetCard
            title="Dogecoin-Style Coin (White Glyph Edition)"
            description="Pure Dogecoin aesthetic: vibrant solid gold coin disc (#C8942A), dark gold minted rim, precision milled coin notches, and the bold S currency glyph with a horizontal crossbar in crisp solid white. No gradients, no shadows, no zaps or sparkles."
            tag="DOGE STYLE"
            filename="sidicoin-doge-white-logo.png"
            bgColor="#EFEBE3"
          >
            <SidicoinLogo size={280} glyphColor="white" />
          </SvgAssetCard>

          {/* 2. Icon Logo (Navy Glyph - Executive Edition) */}
          <SvgAssetCard
            title="Dogecoin-Style Coin (Navy Glyph Edition)"
            description="Deep navy lettermark version on solid coin gold. Clean, high-contrast, flat solid vector rendering ideal for light backgrounds, stamps, and high-visibility placements."
            tag="NAVY GLYPH"
            filename="sidicoin-doge-navy-logo.png"
            bgColor="#EFEBE3"
          >
            <SidicoinLogo size={280} glyphColor="navy" />
          </SvgAssetCard>

          {/* 3. Full Logo Light */}
          <SvgAssetCard
            title="Full Logo (Light)"
            description="Complete Sidicoin lockup featuring the flat Dogecoin-style coin emblem with the bold SIDICOIN wordmark on transparent background. Ideal for light themes and documents."
            tag="LIGHT"
            filename="sidicoin-logo-light.png"
            bgColor="#EFEBE3"
          >
            <SidicoinFullLogo width={520} dark={false} />
          </SvgAssetCard>

          {/* 4. Full Logo Dark */}
          <SvgAssetCard
            title="Full Logo (Navy)"
            description="Complete Sidicoin logo lockup on deep solid navy background (#1B2A4A) with gold subtitle accents. Zero shadows, zero gradients, maximum brand contrast."
            tag="NAVY"
            filename="sidicoin-logo-navy.png"
            bgColor={navy}
          >
            <SidicoinFullLogo width={520} dark={true} />
          </SvgAssetCard>

          {/* 5. Telegram Profile */}
          <SvgAssetCard
            title="Telegram Profile Picture"
            description="Square avatar optimized for the Telegram bot profile and mobile apps. Crisp and punchy at any size from 32x32 up to 4K resolution."
            tag="SQUARE"
            filename="sidicoin-telegram-avatar.png"
            bgColor={navy}
          >
            <div style={{ padding: "20px" }}>
              <SidicoinLogo size={240} glyphColor="white" />
            </div>
          </SvgAssetCard>

          {/* 6. Welcome Banner */}
          <SvgAssetCard
            title="Welcome Banner"
            description="Solid flat wide banner for Telegram channel headers, welcome messages, and web hero placements with the gold coin, bold typography, and TON badge."
            tag="BANNER"
            filename="sidicoin-welcome-banner.png"
            bgColor="#0F1D36"
          >
            <WelcomeBanner width={760} />
          </SvgAssetCard>
        </div>

        {/* Footer */}
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
