import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/.cache/**',
      '**/next-env.d.ts',
    ],
  },

  // TypeScript and React configuration
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Promise: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        Symbol: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
        typescript: true,
      },
    },
    rules: {
      // Import rules
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
      ],
      'import/no-namespace': 'error',
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'error',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],

      // Unused imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // General rules
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      'arrow-body-style': ['error', 'as-needed'],
      'func-style': ['error', 'expression'],
      'no-use-before-define': 'off',

      // TypeScript rules
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],

      // React rules
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/jsx-max-depth': ['error', { max: 7 }],
      'react/jsx-sort-props': 'error',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function' },
      ],
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/react-in-jsx-scope': 'off',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // a11y
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'both' }],

      // Restricted syntax
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: "Don't declare enums.",
        },
        {
          selector: 'TSInterfaceDeclaration',
          message: 'Prefer types to interfaces.',
        },
        {
          selector: 'CallExpression[callee.name="useMemo"]',
          message:
            'useMemo is no longer needed with React Compiler. Consider removing it.',
        },
        {
          selector:
            'CallExpression[callee.object.name="React"][callee.property.name="useMemo"]',
          message:
            'React.useMemo is no longer needed with React Compiler. Consider removing it.',
        },
        {
          selector: 'CallExpression[callee.name="useCallback"]',
          message:
            'useCallback is no longer needed with React Compiler. Consider removing it.',
        },
        {
          selector:
            'CallExpression[callee.object.name="React"][callee.property.name="useCallback"]',
          message:
            'React.useCallback is no longer needed with React Compiler. Consider removing it.',
        },
        {
          selector:
            'CallExpression[callee.object.name="React"][callee.property.name="memo"]',
          message:
            'React.memo is no longer needed with React Compiler. Consider removing it.',
        },
      ],
    },
  },

  // TS-only: require typedef
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/typedef': 'error',
    },
  },

  // Root config files (no tsconfig project)
  {
    files: ['.*.js', '*.config.{js,ts,mjs}', 'eslint.config.mjs'],
    languageOptions: {
      parserOptions: { project: null },
    },
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/typedef': 'off',
    },
  },

  // JS files: relax TS rules
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/typedef': 'off',
    },
  },

  // Allow default exports in Next.js app/pages dirs
  {
    files: ['**/src/app/**/*.{ts,tsx,js,jsx}', '**/src/pages/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Tests and config files: relax rules
  {
    files: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/next.config.{js,ts}',
      '**/vitest.config.{js,ts}',
      '**/jest.config.{js,ts}',
      '**/playwright.config.{js,ts}',
    ],
    languageOptions: {
      parserOptions: { project: null },
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'import/no-default-export': 'off',
      'no-console': 'off',
      'no-alert': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/typedef': 'off',
    },
  },

  // Prettier must be last
  prettierConfig,
];
