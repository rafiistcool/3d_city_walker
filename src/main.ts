import { BasicWorld } from './BasicWorld';

if (typeof THREE !== 'undefined') {
  new BasicWorld();
} else {
  console.error('Three.js has not been loaded.');
  const canvas = document.getElementById('webglCanvas') as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText('Error: Three.js failed to load. Check CDN link.', 10, 50);
    }
  }
}
