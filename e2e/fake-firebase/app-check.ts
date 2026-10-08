/** Nep-App Check voor de end-to-end-tests: doet niets. */
export function initializeAppCheck(): void {}
export class ReCaptchaEnterpriseProvider {
  readonly sleutel: string;
  constructor(sleutel: string) {
    this.sleutel = sleutel;
  }
}
