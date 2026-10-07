/**
 * dua-oplossing.ts — de oplossing van D.U.A. voor het tijd-voorbij-scherm.
 * Base64-gecodeerd zodat ze niet leesbaar in de bron staat; tijd-voorbij.ts
 * toont ze enkel met een sessiecode (die sessie wordt daar gesloten).
 */
const OPLOSSING =
  'WyJCcmllZiBYSUkga3JlZWcgdmlqZiBkaWVwZXIgZ2VkcnVrdGUgbGV0dGVyczogS0xVSVMuIiwgIlR3YWFsZiBicmlldmVuIGt3YW1lbiBhYW4gYmlqIGhldCBiaXNkb20sIGR1cyBsYWcgSm9oYW5uZXMgZGUgRG9wZXIgaW4gYmFnYWdla2x1aXMgMTMgdmFuIGhldCBOb29yZHN0YXRpb24uIiwgIkRlIGJ1dXJtYW4gbG9vZyBvdmVyIGRlIHZvbGxlIG1hYW4uIERlIGRyYWdlcnMgbGllcGVuIHZhbiBkZSBzYWNyaXN0aWUgKDMpIHZpYSBkZSBrb29yb21nYW5nICgxKSBuYWFyIGRlIFZpamRrYXBlbCAoOSkgZW4gZGUgemlqZGV1ciAoNCk6IDMxOTQuIiwgIkhldCBtYXBqZSBvdmVybGVlZmRlIGRlIGh1aXN6b2VraW5nIGluIGRlIHNjaG91dyBvZiBvbmRlciBkZSBsb3NzZSB2bG9lcnBsYW5rLCBuaWV0IGluIGhldCBidXJlYXUsIGRlIGthc3Qgb2YgaGV0IGJvZWtlbnJlay4iLCAiSGV0IHBhbmVlbCBibGVlZiBpbiBkZSBTaW50LUJhYWZza2F0aGVkcmFhbCB6ZWxmLCBpbiBoZXQgdm9sbGUgemljaHQsIHdhYXIgYWxsZXMgYmVnb24uIl0=';

/** De oplossing als lijst van zinnen. */
export function duaOplossing(): string[] {
  const bytes = Uint8Array.from(atob(OPLOSSING), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as string[];
}
