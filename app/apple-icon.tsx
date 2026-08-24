import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '40px',
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #1a6b3c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Shine overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 90,
          borderRadius: '40px 40px 80px 80px',
          background: 'rgba(255,255,255,0.12)',
        }} />

        {/* Gift icon large */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Bow */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: -2 }}>
            <div style={{
              width: 38, height: 28,
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '50% 10% 10% 50%',
              marginRight: -3,
              transform: 'rotate(-15deg)',
            }} />
            <div style={{
              width: 16, height: 16,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#059669,#0d9488)',
              border: '3px solid rgba(255,255,255,0.95)',
              zIndex: 1,
            }} />
            <div style={{
              width: 38, height: 28,
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '10% 50% 50% 10%',
              marginLeft: -3,
              transform: 'rotate(15deg)',
            }} />
          </div>
          {/* Horizontal ribbon */}
          <div style={{
            width: 108, height: 14,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 5,
          }} />
          {/* Box with vertical ribbon */}
          <div style={{
            width: 96, height: 54,
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '0 0 10px 10px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 14, height: '100%',
              background: 'rgba(5,150,105,0.3)',
              borderRadius: '0 0 5px 5px',
            }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
