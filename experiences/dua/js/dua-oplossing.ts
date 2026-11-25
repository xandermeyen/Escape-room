/**
 * dua-oplossing.ts — de oplossing van D.U.A. voor het tijd-voorbij-scherm.
 * Base64-gecodeerd zodat ze niet leesbaar in de bron staat; tijd-voorbij.ts
 * toont ze enkel met een sessiecode (die sessie wordt daar gesloten).
 */
import type { Speltaal } from '../../../shared/js/speltaal.ts';

const OPLOSSING_NL =
  'WyJCcmllZiBYSUkga3JlZWcgdmlqZiBkaWVwZXIgZ2VkcnVrdGUgbGV0dGVyczogS0xVSVMuIiwgIlR3YWFsZiBicmlldmVuIGt3YW1lbiBhYW4gYmlqIGhldCBiaXNkb20sIGR1cyBsYWcgSm9oYW5uZXMgZGUgRG9wZXIgaW4gYmFnYWdla2x1aXMgMTMgdmFuIGhldCBOb29yZHN0YXRpb24uIiwgIkRlIGJ1dXJtYW4gbG9vZyBvdmVyIGRlIHZvbGxlIG1hYW4uIERlIGRyYWdlcnMgbGllcGVuIHZhbiBkZSBzYWNyaXN0aWUgKDMpIHZpYSBkZSBrb29yb21nYW5nICgxKSBuYWFyIGRlIFZpamRrYXBlbCAoOSkgZW4gZGUgemlqZGV1ciAoNCk6IDMxOTQuIiwgIkhldCBtYXBqZSBvdmVybGVlZmRlIGRlIGh1aXN6b2VraW5nIGluIGRlIHNjaG91dyBvZiBvbmRlciBkZSBsb3NzZSB2bG9lcnBsYW5rLCBuaWV0IGluIGhldCBidXJlYXUsIGRlIGthc3Qgb2YgaGV0IGJvZWtlbnJlay4iLCAiSGV0IHBhbmVlbCBibGVlZiBpbiBkZSBTaW50LUJhYWZza2F0aGVkcmFhbCB6ZWxmLCBpbiBoZXQgdm9sbGUgemljaHQsIHdhYXIgYWxsZXMgYmVnb24uIl0=';

const OPLOSSING_EN =
  'WyJMZXR0ZXIgWElJIGhhZCBzaXggbGV0dGVycyBzdHJ1Y2sgaGFyZGVyOiBMT0NLRVIuIiwgIlR3ZWx2ZSBsZXR0ZXJzIHJlYWNoZWQgdGhlIGJpc2hvcCwgc28gSm9obiB0aGUgQmFwdGlzdCBsYXkgaW4gbHVnZ2FnZSBsb2NrZXIgMTMgYXQgTm9ydGggU3RhdGlvbi4iLCAiVGhlIG5laWdoYm91ciBsaWVkIGFib3V0IHRoZSBmdWxsIG1vb24uIFRoZSBjYXJyaWVycyB3ZW50IGZyb20gdGhlIHNhY3Jpc3R5ICgzKSB2aWEgdGhlIGFtYnVsYXRvcnkgKDEpIHRvIHRoZSBWaWpkIENoYXBlbCAoOSkgYW5kIHRoZSBzaWRlIGRvb3IgKDQpOiAzMTk0LiIsICJUaGUgZm9sZGVyIHN1cnZpdmVkIHRoZSBzZWFyY2ggaW4gdGhlIGZpcmVwbGFjZSBvciB1bmRlciB0aGUgbG9vc2UgZmxvb3Jib2FyZCwgbm90IGluIHRoZSBkZXNrLCB0aGUgY3VwYm9hcmQgb3IgdGhlIGJvb2tzaGVsZi4iLCAiVGhlIHBhbmVsIHN0YXllZCBpbiBTdCBCYXZvJ3MgQ2F0aGVkcmFsIGl0c2VsZiwgaW4gcGxhaW4gc2lnaHQsIHdoZXJlIGl0IGFsbCBiZWdhbi4iXQ==';

/** De oplossing als lijst van zinnen, in de speltaal. */
export function duaOplossing(taal: Speltaal = 'nl'): string[] {
  const bytes = Uint8Array.from(atob(taal === 'en' ? OPLOSSING_EN : OPLOSSING_NL), c =>
    c.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as string[];
}
