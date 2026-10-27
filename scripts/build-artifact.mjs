/**
 * Gera uma versão de arquivo único do TravelDesk para publicar como Artifact no claude.ai.
 * Saída: dist-artifact/traveldesk.html (JS, CSS e fontes embutidos).
 *
 * Uso: npm run build:artifact
 */
import { readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';

const outDir = 'dist-artifact';
process.env.VITE_TARGET = 'artifact';

await rm(outDir, { recursive: true, force: true });
await build({
  logLevel: 'warn',
  build: {
    outDir,
    assetsInlineLimit: 10_000_000, // fontes viram data URIs
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { codeSplitting: false } },
  },
});

const assetsDir = join(outDir, 'assets');
const files = await readdir(assetsDir);
const js = await readFile(join(assetsDir, files.find((f) => f.endsWith('.js'))), 'utf8');
const css = await readFile(join(assetsDir, files.find((f) => f.endsWith('.css'))), 'utf8');

// O claude.ai envolve a página com <!doctype>, <head> e <body>: escrevemos só o conteúdo.
const html = `<title>TravelDesk</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css.replace(/<\/style/gi, '<\\/style')}:root{--safe-top:0px}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;

const target = join(outDir, 'traveldesk.html');
await writeFile(target, html);
console.log(`${target} — ${(html.length / 1024).toFixed(0)} KB`);
