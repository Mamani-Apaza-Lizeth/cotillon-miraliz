import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Análisis estático del frontend. Las Edge Functions (Deno) se excluyen: usan otro runtime.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'supabase/functions'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Proveedores de contexto (exportan su hook), punto de entrada y enrutador.
    files: ['src/context/**/*.tsx', 'src/main.tsx', 'src/App.tsx', 'src/components/ui/Button.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
