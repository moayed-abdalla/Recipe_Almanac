'use client';

import { useEffect } from 'react';

interface StepImageLightboxProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export function StepImageLightbox({ imageUrl, alt, onClose }: StepImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20 z-10"
        aria-label="Close image"
      >
        ✕
      </button>
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-[min(90vw,640px)] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl scale-105 transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
