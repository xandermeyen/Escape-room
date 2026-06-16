import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nounsanitized from 'eslint-plugin-no-unsanitized';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Build output en dependencies nooit linten
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      'no-unsanitized': nounsanitized,
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        crypto: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        history: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        Audio: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
      },
    },
    rules: {
      // Kern van item 2: geen ongesanitiseerde innerHTML/insertAdjacentHTML meer.
      // `el.innerHTML = ''` (leegmaken) blijft toegestaan.
      'no-unsanitized/property': 'error',
      'no-unsanitized/method': 'error',
      // Item 1-vangnet: non-null assertions (!) verbergen precies de bugs die
      // strict mode hoort te vangen. Waarschuwen, niet blokkeren, zodat de
      // bestaande code blijft bouwen maar nieuwe gevallen opvallen.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    // Tests bouwen DOM-fixtures op via innerHTML; geen externe invoer, dus de
    // XSS-regel is hier niet relevant.
    files: ['tests/**/*.ts'],
    rules: {
      'no-unsanitized/property': 'off',
      'no-unsanitized/method': 'off',
    },
  },
  // Prettier als laatste: zet alle opmaak-regels uit zodat eslint en prettier
  // elkaar niet tegenspreken.
  prettier,
);
