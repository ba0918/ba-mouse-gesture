# 推奨コマンド一覧

## 基本開発コマンド
```bash
# 依存関係インストール
pnpm install

# 開発ビルド（minifyなし）
pnpm run build:dev

# 本番ビルド（minify有効）
pnpm run build

# ファイル監視・自動ビルド
pnpm run build:watch
```

## テスト関連
```bash
# 全テスト実行（368テスト）
pnpm test

# テスト監視モード
pnpm run test:watch

# カバレッジ付きテスト
pnpm run test:coverage

# E2Eテスト実行
pnpm run test:e2e
```

## 品質チェック
```bash
# ESLint実行
pnpm run lint

# ESLint自動修正
pnpm run lint:fix

# TypeScript型チェック
pnpm run typecheck
```

## Git関連
```bash
# Huskyセットアップ
pnpm run prepare

# 品質ゲート確認（自動実行）
git commit   # → pre-commit: lint + 関連テスト
git push     # → pre-push: 全テストスイート
```

## システムユーティリティ（Linux）
```bash
# ファイル操作
ls -la       # ファイル一覧
find . -name "*.js"  # ファイル検索
grep -r "pattern" .  # パターン検索（推奨: rg）
rg "pattern"         # ripgrep（高速検索）

# Git操作
git status
git diff
git log --oneline
```

## 開発フロー
1. `pnpm run build:watch` でファイル監視開始
2. コード編集
3. `pnpm test` で品質確認
4. `git commit` で自動品質チェック実行
5. `git push` で全テスト実行