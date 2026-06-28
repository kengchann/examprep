// Shared artwork for the app icons (browser favicon + iOS home screen).
// Rendered to PNG at build time via next/og ImageResponse — drawn with plain
// boxes (no emoji) so it renders reliably. Matches the in-app clipboard logo.
export function iconArt(s: number) {
  const line = Math.max(2, s * 0.05)
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: '#534AB7',
      }}
    >
      <div
        style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          width: s * 0.5, height: s * 0.6, background: '#ffffff', borderRadius: s * 0.1,
        }}
      >
        {/* clipboard clip straddling the top edge */}
        <div
          style={{
            position: 'absolute', top: -(s * 0.05), width: s * 0.24, height: s * 0.11,
            background: '#ffffff', border: `${Math.max(2, s * 0.028)}px solid #534AB7`,
            borderRadius: s * 0.045, display: 'flex',
          }}
        />
        {/* "text" lines on the paper */}
        <div style={{ width: '60%', height: line, background: '#534AB7', borderRadius: 999, marginBottom: s * 0.055 }} />
        <div style={{ width: '60%', height: line, background: '#cbd5e1', borderRadius: 999, marginBottom: s * 0.055 }} />
        <div style={{ width: '60%', height: line, background: '#cbd5e1', borderRadius: 999 }} />
      </div>
    </div>
  )
}
