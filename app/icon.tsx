import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #1a6b3c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(5,150,105,0.5)',
        }}
      >
        {/* Gift ribbon horizontal */}
        <div style={{
          position: 'absolute',
          width: 20,
          height: 3,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          top: 14,
          left: 6,
        }} />
        {/* Gift box */}
        <div style={{
          position: 'absolute',
          width: 18,
          height: 10,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 2,
          top: 17,
          left: 7,
        }} />
        {/* Ribbon left bow */}
        <div style={{
          position: 'absolute',
          width: 7,
          height: 5,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '50% 0 0 50%',
          top: 9,
          left: 7,
          transform: 'rotate(-20deg)',
        }} />
        {/* Ribbon right bow */}
        <div style={{
          position: 'absolute',
          width: 7,
          height: 5,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '0 50% 50% 0',
          top: 9,
          left: 18,
          transform: 'rotate(20deg)',
        }} />
        {/* Vertical ribbon */}
        <div style={{
          position: 'absolute',
          width: 3,
          height: 18,
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 2,
          top: 8,
          left: 14.5,
        }} />
        {/* Bow center knot */}
        <div style={{
          position: 'absolute',
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669, #0d9488)',
          border: '1.5px solid rgba(255,255,255,0.9)',
          top: 11.5,
          left: 13.5,
        }} />
      </div>
    ),
    { ...size }
  );
}
