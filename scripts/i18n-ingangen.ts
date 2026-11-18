/**
 * i18n-ingangen.ts: Vite-ingangen voor de gegenereerde pagina's in andere talen.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { DOELTALEN } from '../i18n/config.ts';

/** Vite-ingangen voor de gegenereerde pagina's die op schijf staan. */
export function gegenereerdeIngangen(root: string): Record<string, string> {
  const ingangen: Record<string, string> = {};
  for (const taal of DOELTALEN) {
    const map = resolve(root, taal);
    if (!existsSync(map)) continue;
    for (const bestand of alleHtml(map)) {
      const naam = `${taal}-${relative(map, bestand)
        .replace(/\\/g, '/')
        .replace(/\.html$/, '')}`;
      ingangen[naam.replace(/[^a-zA-Z0-9-]/g, '-')] = bestand;
    }
  }
  return ingangen;
}

function alleHtml(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) uit.push(...alleHtml(pad));
    else if (naam.endsWith('.html')) uit.push(pad);
  }
  return uit;
}
