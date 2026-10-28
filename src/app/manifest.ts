import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SceneGen - Live operations for the whole show',
    short_name: 'SceneGen',
    description: 'Plan tours, advance shows, share day sheets and close the numbers in one live-operations workspace.',
    start_url: '/dashboard',
    scope: '/',
    id: '/dashboard',
    display: 'standalone',
    background_color: '#f2ede3',
    theme_color: '#11140f',
    orientation: 'portrait-primary',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
