import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

const targets = [
  { src: 'public/favicon.svg', out: 'public/favicon.png',    width: 192 },
  { src: 'public/favicon.svg', out: 'public/favicon-32.png', width: 32  },
  { src: 'public/logo.svg',    out: 'public/logo.png',       width: 520 },
];

for (const { src, out, width } of targets) {
  const svg = readFileSync(resolve(root, src), 'utf-8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  writeFileSync(resolve(root, out), png);
  console.log(`created ${out} (${width}px wide)`);
}
