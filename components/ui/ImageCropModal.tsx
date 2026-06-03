'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

interface ImageCropModalProps {
  imageSrc: string;
  aspect?: number;
  /** 'rect' for rectangular crop (recipes), 'round' for circular crop (avatars) */
  cropShape?: 'rect' | 'round';
  title?: string;
  onConfirm: (croppedFile: File, previewUrl: string) => void;
  onCancel: () => void;
}

/**
 * Fetch any image URL (including remote Supabase URLs) and return a data URL.
 * This avoids canvas CORS tainting when we later draw the image to a canvas.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string> {
  // blob/data URLs are already local — return them as-is
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  outputMimeType: string = 'image/jpeg',
): Promise<{ file: File; previewUrl: string }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      const ext = outputMimeType === 'image/png' ? 'png' : 'jpg';
      const file = new File([blob], `cropped.${ext}`, { type: outputMimeType });
      const previewUrl = URL.createObjectURL(blob);
      resolve({ file, previewUrl });
    }, outputMimeType, 0.92);
  });
}

export default function ImageCropModal({
  imageSrc,
  aspect = 16 / 9,
  cropShape = 'rect',
  title = 'Edit Image',
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const { file, previewUrl } = await getCroppedImage(imageSrc, croppedAreaPixels);
      onConfirm(file, previewUrl);
    } catch (err) {
      console.error('Crop error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full bg-black" style={{ height: '340px' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-60 w-6 text-center select-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="range range-primary range-sm flex-1"
              aria-label="Zoom"
            />
            <span className="text-sm opacity-60 w-6 text-center select-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 8v6M8 11h6" />
              </svg>
            </span>
          </div>
          <p className="text-xs opacity-50 text-center mt-1">
            Drag to pan · Scroll or use slider to zoom
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost flex-1"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary flex-1"
            disabled={processing}
          >
            {processing ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
