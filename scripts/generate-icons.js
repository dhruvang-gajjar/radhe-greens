const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function getThemeColor() {
  if (process.env.NEXT_PUBLIC_THEME_COLOR) {
    return process.env.NEXT_PUBLIC_THEME_COLOR.trim();
  }
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const match = content.match(/NEXT_PUBLIC_THEME_COLOR\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  return "#dc2626";
}

function darkenHex(hex, percent = 22) {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return darkenHex(clean.split("").map((c) => c + c).join(""), percent);
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return "#991b1b";
  const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent / 100)));
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent / 100)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function generateSvg({ size, isMaskable = false, primaryColor = "#dc2626" }) {
  const secondaryColor = darkenHex(primaryColor, 25);
  const radius = isMaskable ? 0 : size * 0.22;
  const scale = isMaskable ? 0.70 : 0.86;
  const offset = (size * (1 - scale)) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="themeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
      <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.025}" flood-opacity="0.30" />
      </filter>
    </defs>
    
    <!-- Background Squircle / Full bleed for maskable -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#themeGrad)" />

    <!-- Scaled & Centered Modern Universal Residence Emblem (No text) -->
    <g transform="translate(${offset}, ${offset}) scale(${scale})">
      <g filter="url(#dropShadow)" fill="none" stroke="#ffffff" stroke-width="${size * 0.038}" stroke-linecap="round" stroke-linejoin="round">
        <!-- Main Center Tower -->
        <path d="M ${size * 0.32} ${size * 0.16} L ${size * 0.68} ${size * 0.16} L ${size * 0.68} ${size * 0.84} L ${size * 0.32} ${size * 0.84} Z" fill="#ffffff" fill-opacity="0.16" />
        <!-- Left Wing -->
        <path d="M ${size * 0.16} ${size * 0.36} L ${size * 0.32} ${size * 0.36} L ${size * 0.32} ${size * 0.84} L ${size * 0.16} ${size * 0.84} Z" fill="#ffffff" fill-opacity="0.10" />
        <!-- Right Wing -->
        <path d="M ${size * 0.68} ${size * 0.36} L ${size * 0.84} ${size * 0.36} L ${size * 0.84} ${size * 0.84} L ${size * 0.68} ${size * 0.84} Z" fill="#ffffff" fill-opacity="0.10" />
        <!-- Tower Apex Architectural Notch -->
        <path d="M ${size * 0.44} ${size * 0.16} L ${size * 0.50} ${size * 0.09} L ${size * 0.56} ${size * 0.16}" stroke-width="${size * 0.032}" />
      </g>

      <!-- Windows and Architecture -->
      <g fill="#ffffff">
        <!-- Center Tower Windows -->
        <rect x="${size * 0.40}" y="${size * 0.26}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />
        <rect x="${size * 0.53}" y="${size * 0.26}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />

        <rect x="${size * 0.40}" y="${size * 0.40}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />
        <rect x="${size * 0.53}" y="${size * 0.40}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />

        <rect x="${size * 0.40}" y="${size * 0.54}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />
        <rect x="${size * 0.53}" y="${size * 0.54}" width="${size * 0.07}" height="${size * 0.07}" rx="${size * 0.015}" />

        <!-- Left Wing Windows -->
        <rect x="${size * 0.21}" y="${size * 0.46}" width="${size * 0.06}" height="${size * 0.06}" rx="${size * 0.012}" />
        <rect x="${size * 0.21}" y="${size * 0.60}" width="${size * 0.06}" height="${size * 0.06}" rx="${size * 0.012}" />

        <!-- Right Wing Windows -->
        <rect x="${size * 0.73}" y="${size * 0.46}" width="${size * 0.06}" height="${size * 0.06}" rx="${size * 0.012}" />
        <rect x="${size * 0.73}" y="${size * 0.60}" width="${size * 0.06}" height="${size * 0.06}" rx="${size * 0.012}" />

        <!-- Ground Archway Entrance -->
        <path d="M ${size * 0.44} ${size * 0.84} L ${size * 0.44} ${size * 0.72} A ${size * 0.06} ${size * 0.06} 0 0 1 ${size * 0.56} ${size * 0.72} L ${size * 0.56} ${size * 0.84} Z" />
      </g>
    </g>
  </svg>`;
}

async function main() {
  const themeColor = getThemeColor();
  console.log(`Generating universal PWA icons using theme color: ${themeColor}...`);

  const targets = [
    { name: "icon-192.png", size: 192, isMaskable: false },
    { name: "icon-512.png", size: 512, isMaskable: false },
    { name: "icon-maskable-512.png", size: 512, isMaskable: true },
    { name: "apple-touch-icon.png", size: 180, isMaskable: false },
  ];

  for (const target of targets) {
    const svg = Buffer.from(
      generateSvg({
        size: target.size,
        isMaskable: target.isMaskable,
        primaryColor: themeColor,
      })
    );
    const outPath = path.join(iconsDir, target.name);
    await sharp(svg).png().toFile(outPath);
    console.log(`✓ Generated ${target.name} (${target.size}x${target.size})`);
  }

  console.log("All universal icons generated successfully without society-specific text!");
}

main().catch((err) => {
  console.warn("Notice: Icon generation warning (non-fatal):", err?.message || err);
});
