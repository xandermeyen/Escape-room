/**
 * i18n.ts: startpunt voor pnpm i18n (wat het doet: zie scripts/i18n-paginas.ts).
 * Apart bestand, zodat tests i18n-paginas.ts kunnen importeren zonder iets te genereren.
 */
import { main } from './i18n-paginas.ts';

await main();
