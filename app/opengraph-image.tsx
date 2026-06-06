import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Recipe Almanac — Free Digital Recipe Book';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #CC5500 0%, #8B3A00 100%)',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        {/* Subtle texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)',
          }}
        />

        {/* Book icon */}
        <div
          style={{
            fontSize: 80,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          📖
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-1px',
            marginBottom: 16,
            display: 'flex',
          }}
        >
          Recipe Almanac
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.85)',
            fontStyle: 'italic',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          Free Digital Recipe Book · No Ads · No Subscriptions
        </div>

        {/* URL pill */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 40,
            paddingLeft: 32,
            paddingRight: 32,
            paddingTop: 10,
            paddingBottom: 10,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 22,
            display: 'flex',
          }}
        >
          recipealmanac.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
