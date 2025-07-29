// ESLint v9 フラット設定ファイル
const js = require('@eslint/js')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

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
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // TypeScript推奨ルール
      ...tsPlugin.configs.recommended.rules,
      
      // 型チェック関連
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      
      // スタイル関連（JSと共通）
      'indent': 'off',
      '@typescript-eslint/indent': ['error', 2],
      'quotes': 'off',
      '@typescript-eslint/quotes': ['error', 'single', { avoidEscape: true }],
      'semi': 'off',
      '@typescript-eslint/semi': ['error', 'never'],
      
      // その他のTypeScript固有ルール
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn'
    }
  }
]