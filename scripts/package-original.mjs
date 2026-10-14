import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('dist-original');
let html = await readFile(resolve(directory, 'original.html'), 'utf8');

for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
    const css = await readFile(resolve(directory, match[1]), 'utf8');
    html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
for (const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
    const javascript = await readFile(resolve(directory, match[1]), 'utf8');
    html = html.replace(match[0], () => `<script type="module">${javascript.replace(/<\/script/gi, '<\\/script')}</script>`);
}
const icon = await readFile(resolve(directory, 'favicon.ico'));
html = html.replace('./favicon.ico', `data:image/x-icon;base64,${icon.toString('base64')}`);
await writeFile(resolve(directory, 'index.html'), html);
await copyFile(resolve('scripts/start-original.py'), resolve(directory, 'start-game.py'));
console.log(`独立原版游戏：dist-original/index.html (${Buffer.byteLength(html)} bytes)`);
