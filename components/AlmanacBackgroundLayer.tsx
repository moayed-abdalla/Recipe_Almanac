import { BG_PIC_URLS } from '@/components/ui/KitchenIconLoader';

/**
 * Renders the same stacked kitchen-icon mask background used on the site,
 * scoped to an almanac preview card. Mask positions inherit from the root
 * CSS variables set by `BackgroundMaskPositions`.
 */
export default function AlmanacBackgroundLayer({
  imageColor,
  bgOpacity,
}: {
  imageColor: string;
  bgOpacity: number;
}) {
  const maskImages = BG_PIC_URLS.map((url) => `url('${url}')`).join(', ');
  const maskPositions = Array.from({ length: 12 }, (_, i) => `var(--bg-mask-pos-${i + 1})`).join(', ');
  const maskSizes = Array.from({ length: 12 }, () => '118px auto').join(', ');

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{
        backgroundColor: imageColor,
        opacity: bgOpacity,
        WebkitMaskImage: maskImages,
        maskImage: maskImages,
        WebkitMaskPosition: maskPositions,
        maskPosition: maskPositions,
        WebkitMaskSize: maskSizes,
        maskSize: maskSizes,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }}
    />
  );
}
