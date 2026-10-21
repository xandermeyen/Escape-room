/**
 * kamer14-oplossing.ts — de oplossing van Kamer 14, voor het tijd-voorbij-
 * scherm. Base64-gecodeerd zodat ze niet leesbaar in de bron of in een
 * zoekresultaat staat; tijd-voorbij.ts toont ze pas als de sessie gesloten is.
 * Wie deze pagina tijdens het spel opent, sluit daarmee zelf zijn sessie.
 */
const OPLOSSING =
  'WyJMZW5hIEJvZ2FlcnQgZ2luZyBuYWFyIGRlIEdyb3RlIE1hcmt0IHZhbiBEaWVzdCwgbmFhciBkZSB0aWVuZGUgdmVyamFhcmRhZyB2YW4gaGFhciBkb2NodGVyIE5vb3IuIiwgIk5vb3Igd29vbnQgc2luZHMgMjAyMSBiaWogcGxlZWdtb2VkZXIgTWFyaWUgU3RhcyBpbiBEaWVzdC4gT3AgZGUgdm9pY2VtYWlsIHNwcmFrIE1hcmllIGFmIG9tIDEwIHV1ciwgaGV0IHV1ciB2YW4gJ0FsdGlqZCBpcyBLb3J0amFramUgemllaycgb3AgZGUgYmVpYWFyZC4iLCAiTGVuYSBzcGFhcmRlIOKCrDI4NSB2b29yIGVlbiBmaWV0czogNyB3ZWtlbiBiaWpkcmFnZSBkaWUgS2F0cmlqbiBoYWFyIHRlcnVnZ2FmLCBwbHVzIOKCrDQwIHZhbiBkZSBiYWtrZXJpai4iLCAiS2F0cmlqbiBicmFjaHQgaGFhciB6ZWxmIG5hYXIgZGUgYnVzIHZhbiAwNzozNSBhYW4gR2VlbCBNYXJrdC4gWmUga29uIHRlbiB2cm9lZ3N0ZSBvbSAwNzo1MCB0aHVpcyB6aWpuLCBkdXMgJ29tIDA3dTQ1IGRlIGthbWVyIGxlZWcgZ2V2b25kZW4nIGtsb3B0ZSBuaWV0LiIsICJMZW5hIG5lZW10IGRlIGJ1cyB2YW4gMTc6MDUgdGVydWcgZW4gaXMgb20gMTc6NTEgaW4gR2VlbC4gTm9vciB3ZXJkIHRpZW4gamFhciBnZWxlZGVuIGdlYm9yZW4gaW4ga2FtZXIgMTQgdmFuIGhldCBBWiBEaWVzdC4iXQ==';

/** De oplossing als lijst van zinnen. */
export function kamer14Oplossing(): string[] {
  const bytes = Uint8Array.from(atob(OPLOSSING), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as string[];
}
