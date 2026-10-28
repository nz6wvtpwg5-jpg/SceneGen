import { ImageResponse } from 'next/og';

export const alt = 'SceneGen - The whole show. One working record.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', background: '#f2ede3', color: '#151713', padding: '72px 78px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 62, height: 62, borderRadius: 14, background: '#ff5a36', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 900 }}>S</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.08em' }}>SCENEGEN</span><span style={{ marginTop: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.28em', opacity: 0.46 }}>LIVE OPERATIONS</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <span style={{ fontSize: 80, lineHeight: 0.95, fontWeight: 900 }}>The whole show.</span>
          <span style={{ fontSize: 80, lineHeight: 0.95, fontWeight: 900, color: '#ff5a36' }}>One working record.</span>
          <span style={{ marginTop: 30, fontSize: 24, lineHeight: 1.4, color: '#62665d' }}>Live operations for artists, agents and promoters.</span>
        </div>
      </div>
    </div>,
    size,
  );
}
