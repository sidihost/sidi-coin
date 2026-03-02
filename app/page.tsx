"use client";

import { useState } from "react";
import { Download, Check, ExternalLink } from "lucide-react";

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
      className="flex items-center gap-2 px-6 py-3 rounded-lg font-sans font-semibold text-sm tracking-wide transition-all duration-200 cursor-pointer bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97]"
    >
      {downloaded ? (
        <>
          <Check className="w-4 h-4" />
          Downloaded
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download {filename.includes("logo") ? "Logo" : "Banner"}
        </>
      )}
    </button>
  );
}

function AssetCard({
  title,
  description,
  src,
  filename,
  dimensions,
}: {
  title: string;
  description: string;
  src: string;
  filename: string;
  dimensions: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="relative w-full bg-secondary flex items-center justify-center p-6">
        <img
          src={src}
          alt={title}
          className="w-full h-auto rounded-lg object-contain max-h-[400px]"
        />
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold text-card-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
            JPG
          </span>
          <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
            {dimensions}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DownloadButton href={src} filename={filename} />
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-sans font-semibold text-sm tracking-wide transition-all duration-200 border border-border text-card-foreground hover:bg-secondary"
          >
            <ExternalLink className="w-4 h-4" />
            Full Size
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BrandAssetsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-mono tracking-wider mb-6">
            BRAND ASSETS
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground tracking-tight text-balance">
            Sidicoin Brand Kit
          </h1>
          <p className="text-muted-foreground mt-4 text-lg font-sans max-w-xl mx-auto text-pretty leading-relaxed">
            Download the official Sidicoin logo and welcome banner.
            High-resolution assets ready for production use.
          </p>
        </header>

        <div className="flex flex-col gap-10">
          <AssetCard
            title="Main Coin Logo (White Background)"
            description="The iconic 3D golden SIDI coin on a clean white background. Perfect for websites, documents, presentations, and any light-background usage. Features African kente-inspired rim details."
            src="/images/sidicoin-logo-main.jpg"
            filename="sidicoin-logo-main.jpg"
            dimensions="High Resolution"
          />

          <AssetCard
            title="Full Logo (Dark Background)"
            description="The golden SIDI coin with SIDICOIN typography on premium dark navy. Ideal for social media headers, promotional material, and dark-themed platforms."
            src="/images/sidicoin-logo-dark.jpg"
            filename="sidicoin-logo-dark.jpg"
            dimensions="High Resolution"
          />

          <AssetCard
            title="Telegram Profile Logo"
            description="Bold, minimal golden S coin on navy blue optimized for small profile sizes. Use this as your Telegram bot profile picture, social media avatar, and app icon. Stays crisp even at 64x64."
            src="/images/sidicoin-logo-telegram.jpg"
            filename="sidicoin-logo-telegram.jpg"
            dimensions="Square"
          />

          <AssetCard
            title="Welcome Banner"
            description="Cinematic wide-format banner with the 3D golden coin, SIDICOIN branding, and 'Africa's Digital Currency' tagline. Use for Telegram channel headers, Twitter/X banners, and website heroes."
            src="/images/sidicoin-banner-v2.jpg"
            filename="sidicoin-banner-v2.jpg"
            dimensions="Wide Format"
          />
        </div>

        <footer className="mt-20 text-center">
          <div className="h-px bg-border mb-8" />
          <p className="text-sm text-muted-foreground font-sans">
            Sidicoin — Instant Money Transfers Across Africa
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-2">
            Built on TON Blockchain
          </p>
        </footer>
      </div>
    </main>
  );
}
