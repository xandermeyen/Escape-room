/**
 * cookie-banner.ts — pagina-entry voor de publieke pagina's: toont de
 * cookiebanner en laadt Google Analytics enkel na toestemming. Koppelt ook de
 * taalknop en de taalsuggestie (zie taal-suggestie.ts).
 */
import { initCookies } from './cookies.ts';
import { initTaal } from './taal-suggestie.ts';

initCookies();
initTaal();
