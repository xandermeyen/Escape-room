/**
 * kamer14-oplossing.ts — de oplossing van Kamer 14, voor het tijd-voorbij-
 * scherm. Base64-gecodeerd zodat ze niet leesbaar in de bron of in een
 * zoekresultaat staat; tijd-voorbij.ts toont ze pas als de sessie gesloten is.
 * Wie deze pagina tijdens het spel opent, sluit daarmee zelf zijn sessie.
 */
const OPLOSSING =
  'WyJPcCBkaW5zZGFnIGVuIGRvbmRlcmRhZyBrd2FtIExlbmEgdGVsa2VucyB1cmVuIHRlIGxhYXQgdGh1aXMuIERhdCB3YXJlbiBoYWFyIHZlcmtlbm5pbmdlbi4iLCAiSGFhciB0ZWtlbmluZyB0b29udCBkZSBTaW50LVN1bHBpdGl1c2tlcmsgb3AgZGUgR3JvdGUgTWFya3QgdmFuIERpZXN0LiIsICJaZXZlbiB3ZWtlbiBoaWVsZCB6ZSBoYWFyIGJpamRyYWdlIHZhbiDigqwzNSBhYW4gaGV0IGdhc3RnZXppbiBhY2h0ZXIsIG9tIGRlIHJlaXMgdGUgYmV0YWxlbi4iLCAiSW4gRGllc3Qgd29vbnQgTWFyaWUgU3RhcywgaGFhciB2cmllbmRpbiB1aXQgVHVybmhvdXQsIHZhbiB3aWUgemUgaGV0IGFkcmVzIGt3aWp0IHdhcy4iLCAiT3AgZGluc2RhZyA2IG1laSBuYW0gemUgbmEgaGV0IG9udGJpanQgZGUgYnVzIHZhbiAwNzozNSBhYW4gR2VlbCBNYXJrdCwgbWV0IGVlbiBkYWdwYXMgdmFuIERlIExpam4uIl0=';

/** De oplossing als lijst van zinnen. */
export function kamer14Oplossing(): string[] {
  const bytes = Uint8Array.from(atob(OPLOSSING), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as string[];
}
