import { BG_PIC_URLS } from '@/components/ui/KitchenIconLoader';
import type { AlmanacBrand } from '@/lib/almanacPdf';

export const BG_MASK_COUNT = 12;

/** Website desktop icon width in CSS pixels (matches `globals.css`). */
export const BG_ICON_WIDTH_PX = 118;

/** Reference viewport width used to scale icons onto A4 pages. */
export const BG_REFERENCE_VIEWPORT_PX = 794;

export interface MaskPosition {
  x: number;
  y: number;
}

/** Fallback positions from `globals.css` when CSS vars are unavailable. */
export const FALLBACK_MASK_POSITIONS: MaskPosition[] = [
  { x: 11, y: 12 },
  { x: 13, y: 27 },
  { x: 9, y: 42 },
  { x: 15, y: 58 },
  { x: 10, y: 73 },
  { x: 89, y: 16 },
  { x: 86, y: 32 },
  { x: 91, y: 48 },
  { x: 84, y: 64 },
  { x: 88, y: 76 },
  { x: 5, y: 40 },
  { x: 95, y: 52 },
];

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (event) => reject(event);
    img.src = url;
  });
}

/** Read live mask positions from the document root CSS variables. */
export function readMaskPositions(): MaskPosition[] {
  if (typeof window === 'undefined') {
    return FALLBACK_MASK_POSITIONS;
  }

  const styles = getComputedStyle(document.documentElement);
  const positions: MaskPosition[] = [];

  for (let i = 1; i <= BG_MASK_COUNT; i += 1) {
    const raw = styles.getPropertyValue(`--bg-mask-pos-${i}`).trim();
    const [xRaw, yRaw] = raw.split(/\s+/);
    const x = Number.parseFloat(xRaw ?? '');
    const y = Number.parseFloat(yRaw ?? '');
    const fallback = FALLBACK_MASK_POSITIONS[i - 1]!;
    positions.push({
      x: Number.isFinite(x) ? x : fallback.x,
      y: Number.isFinite(y) ? y : fallback.y,
    });
  }

  return positions;
}

/** Read the active background-pattern opacity from CSS. */
export function readBgOpacity(): number {
  if (typeof window === 'undefined') {
    return 0.15;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--theme-bg-opacity')
    .trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0.15;
}

async function tintMaskIcon(
  imageUrl: string,
  hexColor: string,
  opacity: number
): Promise<HTMLCanvasElement | null> {
  try {
    const img = await loadImageElement(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.globalAlpha = opacity;
    ctx.fillStyle = hexColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Build a full-page background image that mirrors the site's stacked kitchen-icon
 * masks (`body::before`) for use in the PDF and preview.
 */
export async function buildAlmanacBackgroundDataUrl(
  brand: AlmanacBrand,
  positions: MaskPosition[],
  pageWidthPx: number,
  pageHeightPx: number
): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = pageWidthPx;
  canvas.height = pageHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = brand.background;
  ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);

  const iconWidthPx = BG_ICON_WIDTH_PX * (pageWidthPx / BG_REFERENCE_VIEWPORT_PX);
  const tintedIcons = await Promise.all(
    BG_PIC_URLS.map((url) => tintMaskIcon(url, brand.imageColor, brand.bgOpacity))
  );

  tintedIcons.forEach((iconCanvas, index) => {
    if (!iconCanvas) return;
    const position = positions[index] ?? FALLBACK_MASK_POSITIONS[index]!;
    const iconHeightPx = iconWidthPx * (iconCanvas.height / iconCanvas.width);
    const x = (position.x / 100) * pageWidthPx - iconWidthPx / 2;
    const y = (position.y / 100) * pageHeightPx - iconHeightPx / 2;
    ctx.drawImage(iconCanvas, x, y, iconWidthPx, iconHeightPx);
  });

  return canvas.toDataURL('image/png');
}
