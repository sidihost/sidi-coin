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
   SVG LOGO COMPONENT — The Sidicoin "S" Coin
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SidicoinLogo({ size = 300 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="50%" stopColor={gold} />
          <stop offset="100%" stopColor={goldDark} />
        </linearGradient>
        <linearGradient id="coinShine" x1="0%" y1="0%" x2="50%" y2="50%">
          <stop offset="0%" stopColor="#FFF5D4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFF5D4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="100%" stopColor={goldDark} />
        </linearGradient>
        <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="20" floodColor={goldDark} floodOpacity="0.35" />
        </filter>
        <filter id="innerGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer rim */}
      <circle cx="200" cy="200" r="185" fill="url(#rimGrad)" filter="url(#coinShadow)" />

      {/* Inner coin face */}
      <circle cx="200" cy="200" r="168" fill="url(#coinGrad)" />

      {/* Shine overlay */}
      <circle cx="200" cy="200" r="168" fill="url(#coinShine)" />

      {/* Decorative ring */}
      <circle cx="200" cy="200" r="155" fill="none" stroke={goldLight} strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="200" cy="200" r="148" fill="none" stroke={goldDark} strokeWidth="0.8" strokeOpacity="0.3" />

      {/* Kente pattern dots around rim */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10 * Math.PI) / 180;
        const cx = 200 + 161 * Math.cos(angle);
        const cy = 200 + 161 * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={i % 3 === 0 ? 2.5 : 1.5}
            fill={i % 3 === 0 ? goldLight : goldDark}
            opacity={0.6}
          />
        );
      })}

      {/* The "S" letterform */}
      <text
        x="200"
        y="240"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="180"
        fontWeight="bold"
        fill={navy}
        opacity="0.9"
        filter="url(#innerGlow)"
      >
        S
      </text>

      {/* Strike-through lines */}
      <rect x="138" y="165" width="124" height="4" rx="2" fill={navy} opacity="0.7" />
      <rect x="138" y="228" width="124" height="4" rx="2" fill={navy} opacity="0.7" />

      {/* Highlight arc */}
      <path
        d="M 120 120 A 130 130 0 0 1 280 80"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FULL LOGO WITH TEXT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SidicoinFullLogo({ width = 600, dark = false }: { width?: number; dark?: boolean }) {
  const bg = dark ? navy : "transparent";
  const textColor = dark ? white : navy;
  const subColor = dark ? goldLight : gold;
  return (
    <svg
      width={width}
      height={width * 0.55}
      viewBox="0 0 600 330"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {dark && <rect width="600" height="330" rx="20" fill={bg} />}
      <defs>
        <linearGradient id={`fg-${dark ? "d" : "l"}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="50%" stopColor={gold} />
          <stop offset="100%" stopColor={goldDark} />
        </linearGradient>
        <linearGradient id={`fgShine-${dark ? "d" : "l"}`} x1="0%" y1="0%" x2="50%" y2="50%">
          <stop offset="0%" stopColor="#FFF5D4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF5D4" stopOpacity="0" />
        </linearGradient>
        <filter id={`fgShadow-${dark ? "d" : "l"}`}>
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={goldDark} floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Coin */}
      <g transform="translate(300, 120)" filter={`url(#fgShadow-${dark ? "d" : "l"})`}>
        <circle r="95" fill={`url(#fg-${dark ? "d" : "l"})`} />
        <circle r="95" fill={`url(#fgShine-${dark ? "d" : "l"})`} />
        <circle r="86" fill="none" stroke={goldLight} strokeWidth="1" strokeOpacity="0.5" />
        <circle r="82" fill="none" stroke={goldDark} strokeWidth="0.5" strokeOpacity="0.3" />
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={89 * Math.cos(angle)}
              cy={89 * Math.sin(angle)}
              r={i % 3 === 0 ? 1.8 : 1}
              fill={i % 3 === 0 ? goldLight : goldDark}
              opacity={0.5}
            />
          );
        })}
        <text
          y="22"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="100"
          fontWeight="bold"
          fill={dark ? navy : navy}
          opacity="0.85"
        >
          S
        </text>
        <rect x="-34" y="-17" width="68" height="2.5" rx="1.25" fill={navy} opacity="0.6" />
        <rect x="-34" y="17" width="68" height="2.5" rx="1.25" fill={navy} opacity="0.6" />
      </g>

      {/* Text */}
      <text
        x="300"
        y="262"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="42"
        fontWeight="800"
        letterSpacing="8"
        fill={textColor}
      >
        SIDICOIN
      </text>
      <text
        x="300"
        y="295"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="13"
        fontWeight="500"
        letterSpacing="5"
        fill={subColor}
      >
        {"AFRICA'S DIGITAL CURRENCY"}
      </text>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TELEGRAM WELCOME BANNER
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
      <defs>
        <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={navy} />
          <stop offset="100%" stopColor={navyLight} />
        </linearGradient>
        <linearGradient id="bannerCoin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="50%" stopColor={gold} />
          <stop offset="100%" stopColor={goldDark} />
        </linearGradient>
        <linearGradient id="bannerShine" x1="0%" y1="0%" x2="50%" y2="50%">
          <stop offset="0%" stopColor="#FFF5D4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF5D4" stopOpacity="0" />
        </linearGradient>
        <filter id="bannerGlow">
          <feGaussianBlur stdDeviation="30" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="glowOrb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={gold} stopOpacity="0.15" />
          <stop offset="100%" stopColor={gold} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="360" rx="16" fill="url(#bannerBg)" />

      {/* Decorative grid lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * 50}
          x2="800"
          y2={i * 50}
          stroke={goldLight}
          strokeWidth="0.3"
          strokeOpacity="0.08"
        />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * 55}
          y1="0"
          x2={i * 55}
          y2="360"
          stroke={goldLight}
          strokeWidth="0.3"
          strokeOpacity="0.08"
        />
      ))}

      {/* Glow behind coin */}
      <circle cx="180" cy="180" r="160" fill="url(#glowOrb)" />

      {/* Coin */}
      <g transform="translate(180, 160)" filter="url(#bannerGlow)">
        <circle r="90" fill="url(#bannerCoin)" />
        <circle r="90" fill="url(#bannerShine)" />
        <circle r="82" fill="none" stroke={goldLight} strokeWidth="1" strokeOpacity="0.4" />
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={85 * Math.cos(angle)}
              cy={85 * Math.sin(angle)}
              r={i % 3 === 0 ? 1.5 : 0.8}
              fill={i % 3 === 0 ? goldLight : goldDark}
              opacity={0.5}
            />
          );
        })}
        <text
          y="20"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="96"
          fontWeight="bold"
          fill={navy}
          opacity="0.85"
        >
          S
        </text>
        <rect x="-32" y="-16" width="64" height="2.5" rx="1.25" fill={navy} opacity="0.6" />
        <rect x="-32" y="16" width="64" height="2.5" rx="1.25" fill={navy} opacity="0.6" />
      </g>

      {/* Floating particles */}
      {[
        { x: 350, y: 60, r: 3 },
        { x: 420, y: 120, r: 2 },
        { x: 550, y: 80, r: 2.5 },
        { x: 680, y: 140, r: 1.5 },
        { x: 380, y: 280, r: 2 },
        { x: 620, y: 300, r: 1.8 },
        { x: 750, y: 250, r: 2.2 },
        { x: 500, y: 200, r: 1.2 },
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={goldLight} opacity={0.3 + (i % 3) * 0.15} />
      ))}

      {/* Network connection lines */}
      <line x1="350" y1="60" x2="420" y2="120" stroke={gold} strokeWidth="0.5" strokeOpacity="0.12" />
      <line x1="420" y1="120" x2="550" y2="80" stroke={gold} strokeWidth="0.5" strokeOpacity="0.12" />
      <line x1="550" y1="80" x2="680" y2="140" stroke={gold} strokeWidth="0.5" strokeOpacity="0.12" />
      <line x1="380" y1="280" x2="500" y2="200" stroke={gold} strokeWidth="0.5" strokeOpacity="0.12" />
      <line x1="500" y1="200" x2="620" y2="300" stroke={gold} strokeWidth="0.5" strokeOpacity="0.12" />

      {/* Welcome text */}
      <text
        x="520"
        y="130"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="14"
        fontWeight="500"
        letterSpacing="5"
        fill={goldLight}
        opacity="0.8"
      >
        WELCOME TO
      </text>
      <text
        x="520"
        y="185"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="52"
        fontWeight="800"
        letterSpacing="4"
        fill={white}
      >
        SIDICOIN
      </text>

      {/* Gold divider */}
      <rect x="430" y="205" width="180" height="2" rx="1" fill={gold} opacity="0.5" />

      {/* Tagline */}
      <text
        x="520"
        y="240"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="14"
        fontWeight="500"
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
        fontSize="14"
        fontWeight="500"
        letterSpacing="3"
        fill={goldLight}
      >
        ACROSS AFRICA
      </text>

      {/* TON badge */}
      <rect x="470" y="290" width="100" height="24" rx="12" fill={white} fillOpacity="0.08" />
      <text
        x="520"
        y="306"
        textAnchor="middle"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="10"
        fontWeight="600"
        letterSpacing="2"
        fill={white}
        opacity="0.5"
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
          {/* 1. Icon Logo on White */}
          <SvgAssetCard
            title="Coin Logo"
            description="The iconic golden SIDI coin with the embossed S lettermark, African kente-inspired rim details, and metallic gold gradient. Perfect for app icons, favicons, profile pictures, and any square placement."
            tag="ICON"
            filename="sidicoin-coin-logo.png"
            bgColor="#EFEBE3"
          >
            <SidicoinLogo size={280} />
          </SvgAssetCard>

          {/* 2. Full Logo Light */}
          <SvgAssetCard
            title="Full Logo (Light)"
            description="Complete Sidicoin logo with coin icon and SIDICOIN wordmark on a transparent background. Ideal for websites, documents, presentations, and light-themed platforms."
            tag="LIGHT"
            filename="sidicoin-logo-light.png"
            bgColor="#EFEBE3"
          >
            <SidicoinFullLogo width={520} dark={false} />
          </SvgAssetCard>

          {/* 3. Full Logo Dark */}
          <SvgAssetCard
            title="Full Logo (Navy)"
            description="Complete Sidicoin logo on deep navy background. Use for social media banners, marketing materials, and dark-themed platforms. Features the gold accent tagline."
            tag="NAVY"
            filename="sidicoin-logo-navy.png"
            bgColor={navy}
          >
            <SidicoinFullLogo width={520} dark={true} />
          </SvgAssetCard>

          {/* 4. Telegram Profile */}
          <SvgAssetCard
            title="Telegram Profile Picture"
            description="Square format coin logo optimized for Telegram bot avatar, social media profiles, and app icons. Stays perfectly crisp even at small sizes like 64x64 pixels."
            tag="SQUARE"
            filename="sidicoin-telegram-avatar.png"
            bgColor={navy}
          >
            <div style={{ padding: "20px" }}>
              <SidicoinLogo size={240} />
            </div>
          </SvgAssetCard>

          {/* 5. Welcome Banner */}
          <SvgAssetCard
            title="Welcome Banner"
            description="Wide-format banner with the golden coin, SIDICOIN wordmark, blockchain network visualization, and the tagline. Perfect for Telegram channel headers, Twitter/X banners, and website hero sections."
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
