import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

await build({ entryPoints: { code: 'src/code.ts' }, bundle: true, target: 'es2017', format: 'iife', outfile: 'dist/code.js', logLevel: 'info' });
const js = (await build({ entryPoints: ['src/ui.ts'], bundle: true, target: 'es2017', format: 'iife', write: false })).outputFiles[0].text;
const html = readFileSync('src/ui.html', 'utf8').replace('</body>', `<script>${js}</script></body>`);
writeFileSync('dist/ui.html', html);
console.log('built dist/code.js + dist/ui.html');
