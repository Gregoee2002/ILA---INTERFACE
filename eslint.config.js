// Config ESLint minimale: serve solo a dare valore alle direttive
// `// eslint-disable-next-line react-hooks/exhaustive-deps` già presenti nel
// codice, che senza un ESLint configurato erano inerti (vedi BUG-10 dell'audit
// 2026-09-01). Non attiva le regole di stile/tipizzazione di typescript-eslint:
// quelle sono un intervento a parte (BUG-04 passo 2).
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**', '**/*.config.js', 'server.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
