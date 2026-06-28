import { ImageResponse } from 'next/og'
import { iconArt } from '@/lib/iconArt'

// Browser tab / favicon.
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(iconArt(512), { ...size })
}
