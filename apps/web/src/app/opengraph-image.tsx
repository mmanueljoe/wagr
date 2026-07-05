import { ImageResponse } from 'next/og'

// Share-preview card for WhatsApp / X — this is what voters see when the
// campaign link spreads. Generated at build time; brand colours hardcoded
// because @theme tokens live in CSS and ImageResponse can't read them.
export const alt = 'Wagr — Don’t wait for payday. Earned wages via USSD in under 60 seconds.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0d1b40',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#f5a623',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0d1b40',
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          W
        </div>
        <div style={{ color: '#ffffff', fontSize: 40, fontWeight: 700 }}>Wagr</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ color: '#ffffff', fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
          Don’t wait for payday.
        </div>
        <div style={{ color: '#f5a623', fontSize: 40, lineHeight: 1.3 }}>
          Wages you’ve already earned — on any phone, in under 60 seconds.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#8b93ad', fontSize: 30 }}>Dial. Confirm. Paid to your MoMo.</div>
        <div style={{ color: '#8b93ad', fontSize: 30 }}>Built on Moolre</div>
      </div>
    </div>,
    size,
  )
}
