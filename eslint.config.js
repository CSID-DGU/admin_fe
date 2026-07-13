import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'DECS Design System/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['src/**/*.jsx'],
    ignores: ['src/design-system/**'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [{ group: ['**/design-system/components/**'], message: "Import DECS components from the design-system index." }],
      }],
      'no-restricted-syntax': ['warn',
        { selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]', message: 'Raw hex color — use a DECS color token.' },
        { selector: 'Literal[value=/\\b\\d+px\\b/]', message: 'Raw px value — use a DECS spacing token.' },
        { selector: `Literal[value=/font-family\\s*:\\s*(?!['"]?(?:Open Sans|Noto Sans KR|JetBrains Mono))/i]`, message: 'Use a DECS font token.' },
        { selector: "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|normal|link|inline-link|icon)$/]", message: 'Invalid DECS Button variant.' },
        { selector: "JSXOpeningElement[name.name='StatusIndicator'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:success|error|warning|info|in-progress|loading|pending|stopped)$/]", message: 'Invalid DECS status type.' },
      ],
    },
  },
])
