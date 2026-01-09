// @ts-check

import url from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import { fixupPluginRules } from '@eslint/compat'
import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import deprecationPlugin from 'eslint-plugin-deprecation'
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments'
import importXPlugin from 'eslint-plugin-import-x'
import jestPlugin from 'eslint-plugin-jest'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import nextPlugin from '@next/eslint-plugin-next'
import noSecretsPlugin from 'eslint-plugin-no-secrets'
import nodePlugin from 'eslint-plugin-node'
import onlyAsciiPlugin from 'eslint-plugin-only-ascii'
import onlyWarnPlugin from 'eslint-plugin-only-warn'
import prettierConfig from 'eslint-plugin-prettier/recommended'
import promisePlugin from 'eslint-plugin-promise'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactPerfPlugin from 'eslint-plugin-react-perf'
import reactPlugin from 'eslint-plugin-react'
import securityPlugin from 'eslint-plugin-security'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'
import sonarJsPlugin from 'eslint-plugin-sonarjs'
import unicornPlugin from 'eslint-plugin-unicorn'
import unusedImportsPlugin from 'eslint-plugin-unused-imports'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

/** @type {import('eslint').Linter.FlatConfig[]} */
export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/.build/',
      '**/.cache/',
      '**/.env*',
      '**/.github/',
      '**/.idea*/',
      '**/.idea/',
      '**/.ignore/',
      '**/.next/',
      '**/.tmp*/',
      '**/.vscode*/',
      '**/__tests__',
      '**/build/',
      '**/cache/',
      '**/eslint.config.*',
      '**/node_modules/',
      '**/public/',
      '**/tmp*/',
      '**/tsconfig*.json',
      '**/vendor/',
      'infra/',
      'lib/',
      'node_modules/',
      'src/gen/**',
      'tools/**',
      'vendor/**',
    ],
  },

  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs', '**/*.jsx', '**/*.ts', '**/*.cts', '**/*.mts', '**/*.tsx'],
    extends: [
      eslint.configs.recommended,
      // sonarJsPlugin.configs.recommended,
      securityPlugin.configs.recommended,
      ...compat.extends('airbnb-base'),
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      prettierConfig,
    ],
    plugins: {
      ['@next/next']: fixupPluginRules(nextPlugin),
      ['@typescript-eslint']: tseslint.plugin,
      ['deprecation']: fixupPluginRules(deprecationPlugin),
      ['eslint-comments']: eslintCommentsPlugin,
      ['import-x']: importXPlugin,
      ['jest']: jestPlugin,
      ['jsx-a11y']: jsxA11yPlugin,
      ['no-secrets']: fixupPluginRules(noSecretsPlugin),
      ['node']: fixupPluginRules(nodePlugin),
      ['only-ascii']: fixupPluginRules(onlyAsciiPlugin),
      ['only-warn']: fixupPluginRules(onlyWarnPlugin),
      ['promise']: fixupPluginRules(promisePlugin),
      ['react']: fixupPluginRules(reactPlugin),
      ['react-hooks']: fixupPluginRules(reactHooksPlugin),
      ['react-perf']: fixupPluginRules(reactPerfPlugin),
      ['security']: securityPlugin,
      ['simple-import-sort']: simpleImportSortPlugin,
      ['unicorn']: unicornPlugin,
      ['unused-imports']: fixupPluginRules(unusedImportsPlugin),
    },
    rules: {
      '@next/next/no-img-element': 'off',
      '@next/next/no-title-in-document-head': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/lines-between-class-members': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-duplicate-imports': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'camelcase': 'off',
      'class-methods-use-this': 'off',
      'default-case': 'warn',
      'deprecation/deprecation': 'warn',
      'jest/consistent-test-it': 'warn',
      'jest/expect-expect': 'warn',
      'jest/no-done-callback': 'warn',
      'jsx-a11y/label-has-associated-control': ['warn', { assert: 'either' }],
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
      'max-classes-per-file': 'off',
      'no-console': ['warn', { allow: ['info', 'warn', 'error', 'memory'] }],
      'no-nested-ternary': 'off',
      'no-param-reassign': ['warn', { ignorePropertyModificationsFor: ['draft'] }],
      'no-plusplus': 'off',
      'no-restricted-syntax': 'off',
      'no-secrets/no-secrets': ['warn', { tolerance: 5 }],
      'no-shadow': 'off',
      'no-underscore-dangle': [
        'warn',
        {
          allowFunctionParams: true,
          allow: ['__dirname', '__filename'],
        },
      ],
      'no-unused-expressions': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      'no-void': 'off',
      'only-ascii/only-ascii': 'warn',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'prefer-for-of': 'off',
      'prettier/prettier': 'warn',
      'react/destructuring-assignment': 'off',
      'react/display-name': 'warn',
      'react/jsx-curly-brace-presence': 'off',
      'react/jsx-filename-extension': ['warn', { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
      'react/jsx-props-no-spreading': 'off',
      'react/no-unused-prop-types': 'off',
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/state-in-constructor': 'off',
      'require-await': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-unsafe-regex': 'off',
      // 'sonarjs/cognitive-complexity': 'off',
      // 'sonarjs/prefer-read-only-props': 'off',
      // 'sonarjs/no-commented-code': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/escape-case': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/new-for-builtins': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-method-this-argument': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-fn-reference-in-iterator': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-reduce': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-zero-fractions': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unused-imports/no-unused-imports': 'warn',

      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'react-hooks/exhaustive-deps': [
        'warn',
        { additionalHooks: '(useRecoilCallback|useRecoilTransaction|useRecoilTransaction_UNSTABLE)' },
      ],

      '@typescript-eslint/prefer-nullish-coalescing': [
        'warn',
        {
          ignoreTernaryTests: true,
          ignoreConditionalTests: true,
          ignoreMixedLogicalExpressions: true,
          ignorePrimitives: {
            bigint: true,
            boolean: true,
            number: true,
          },
        },
      ],

      'simple-import-sort/imports': 'off',
      // 'simple-import-sort/exports': 'warn',
      // 'simple-import-sort/imports': [
      //   'warn',
      //   {
      //     groups: [
      //       [
      //         '^\\u0000',
      //         '^node:',
      //         '^react',
      //         '^\\w',
      //         '^@?\\w',
      //         '^',
      //         '^src/',
      //         '^lib/',
      //         '^../../',
      //         '^../',
      //         '^./',
      //         '^\\.',
      //         '.(css|scss|sass|less|styl|pcss)$',
      //       ],
      //     ],
      //   },
      // ],

      // TODO: broken rules (they crash eslint)
      'flowtype/define-flow-type': 'off',
      'flowtype/use-flow-type': 'off',
      'import/export': 'off',
      'import/first': 'off',
      'import/named': 'off',
      'import/newline-after-import': 'off',
      'import/no-absolute-path': 'off',
      'import/no-amd': 'off',
      'import/no-anonymous-default-export': 'off',
      'import/no-cycle': 'off',
      'import/no-duplicates': 'off',
      'import/no-dynamic-require': 'off',
      'import/no-import-module-exports': 'off',
      'import/no-mutable-exports': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-relative-packages': 'off',
      'import/no-self-import': 'off',
      'import/no-unresolved': 'off',
      'import/no-unused-modules': 'off',
      'import/no-useless-path-segments': 'off',
      'import/no-webpack-loader-syntax': 'off',
      'import/order': 'off',
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/extensions': [
        'warn',
        'ignorePackages',
        { js: 'never', jsx: 'never', mjs: 'never', ts: 'never', tsx: 'never' },
      ],

      // FIXME: these need to be fixed
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-throw-literal': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      'cflint/no-this-assignment': 'off',
      'default-case': 'off',
      'deprecation/deprecation': 'off',
      'eqeqeq': 'off',
      'lodash/prefer-is-nil': 'off',
      'no-continue': 'off',
      'no-else-return': 'off',
      'no-param-reassign': 'off',
      'prefer-destructuring': 'off',
      'prettier/prettier': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
    settings: {
      'react': { version: 'detect' },

      'import/parsers': {
        '@typescript-eslint/parser': ['.js', '.jsx', '.ts', '.tsx'],
      },

      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    linterOptions: {
      // TODO: fix and re-enable
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.jest,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        allowAutomaticSingleRunInference: true,
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },

  // Pages
  {
    files: ['src/pages/**/*', 'src/types/**/*'],
    rules: {
      'no-restricted-exports': 'off',
    },
  },

  // Typings
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'import/no-duplicates': 'off',
      'no-useless-constructor': 'off',
      'react/prefer-stateless-function': 'off',
    },
  },

  // Config files
  {
    files: [
      '**/eslint.config.*',
      '**/babel-node.config.js',
      '**/jest-runner-eslint.config.js',
      '**/jest.config.js',
      '**/next.config.js',
      '**/postcss.config.js',
      '**/stylelint.config.js',
      '**/webpack.config.js',
      'config/**/*.js',
      'config/jest/mocks/**/*.js',
      'infra/**/*.js',
      'lib/EnvVarError.js',
      'lib/findModuleRoot.js',
      'lib/getenv.js',
      'tools/**/*',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'global-require': 'off',
      'import/extensions': 'off',
      'import/no-anonymous-default-export': 'off',
      'import/no-import-module-exports': 'off',
      'security/detect-child-process': 'off',
      // 'sonarjs/cognitive-complexity': 'off',
      'unicorn/prefer-module': 'off',
    },
  },

  // Tests
  {
    files: ['**/*.test.*', '**/__test__/**', '**/__tests__/**', '**/test/**', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      // 'sonarjs/no-duplicate-string': 'off',
      // 'sonarjs/no-identical-functions': 'off',
    },
  },

  // Mocks
  {
    files: ['config/jest/mocks/**/*.js'],

    rules: {
      'no-constructor-return': 'off',
      'react-perf/jsx-no-new-function-as-prop': 'off',
      'react/display-name': 'off',
      'react/function-component-definition': 'off',
    },
  },
)
