// ESLint v9 フラット設定ファイル
const js = require('@eslint/js')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const sveltePlugin = require('eslint-plugin-svelte')

module.exports = [
  {
    ignores: ['**/*.html', 'node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'playwright-report/**', 'test-results/**']
  },
  js.configs.recommended,
  // JavaScript設定
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // ブラウザ環境
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',

        // Chrome拡張機能API
        chrome: 'readonly',

        // プロジェクト固有のグローバル変数
        DebugLogger: 'readonly',
        CustomGestureManager: 'readonly',
        CustomPatternMatcher: 'readonly',
        GestureLearningManager: 'readonly',
        AdaptiveThresholdManager: 'readonly',
        OptionsManager: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',

        // Jest テスト環境
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        global: 'readonly',
        HTMLCanvasElement: 'readonly',

        // Node.js (設定ファイル用)
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly'
      }
    },
    rules: {
      // 基本的なルール
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // セキュリティ関連のルール
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-with': 'error',

      // ベストプラクティス
      'no-alert': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'eqeqeq': ['error', 'always'],
      'no-implicit-coercion': 'warn',
      'no-return-await': 'warn',
      'require-await': 'warn',
      'no-prototype-builtins': 'warn',

      // スタイル関連
      'indent': ['error', 2],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
      'comma-dangle': ['error', 'never'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }]
    }
  },
  {
    // テストファイル用の設定
    files: ['tests/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    // 設定ファイル用の設定
    files: ['*.config.js', '.eslintrc.js'],
    languageOptions: {
      sourceType: 'commonjs'
    }
  },
  // TypeScript設定
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        // TypeScriptファイル用のグローバル
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        chrome: 'readonly',
        HTMLCanvasElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // TypeScript推奨ルール（基本セットのみ適用）
      ...tsPlugin.configs.recommended.rules,
      
      // 型チェック関連
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      
      // スタイル関連ルールは削除（v8では非推奨）
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      
      // その他のTypeScript固有ルール（利用可能なもののみ）
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // 基本JSルールを無効化（TypeScriptルールと競合回避）
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off'
    }
  },
  {
    // TypeScriptテストファイル用の設定
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  // Svelte設定
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: require('svelte-eslint-parser'),
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte']
      },
      globals: {
        // ブラウザ環境のグローバル変数
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        
        // DOM API
        Blob: 'readonly',
        URL: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        
        // Chrome拡張機能API
        chrome: 'readonly'
      }
    },
    plugins: {
      svelte: sveltePlugin
    },
    rules: {
      // Svelte推奨ルール
      ...sveltePlugin.configs.recommended.rules,
      
      // カスタムルール
      'svelte/no-unused-svelte-ignore': 'warn',
      'svelte/no-at-html-tags': 'warn',
      'svelte/indent': ['error', { indent: 2 }],
      
      // TypeScript関連ルールを無効化（Svelteスクリプト内では必要ない場合が多い）
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
]