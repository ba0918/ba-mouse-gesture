# コードスタイル・規約

## ESLint設定（v9フラット設定）
- **JavaScript**: セミコロンなし、シングルクォート、インデント2スペース
- **TypeScript**: 厳密な型チェック、推奨ルール適用
- **Svelte**: コンポーネント専用ルール

## TypeScript設定
- **strict**: true（厳格モード）
- **target**: ES2020
- **module**: ESNext
- **パスエイリアス**: Clean Architecture対応
  - `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`

## ファイル命名規約
- **PascalCase**: クラス、コンポーネント
- **camelCase**: 関数、変数
- **kebab-case**: ファイル名（テストファイルは`.test.js`）

## コミット規約
```
feat: 新機能追加
fix: バグ修正
refactor: リファクタリング
test: テスト追加・修正
docs: ドキュメント更新
style: コードスタイル修正
perf: パフォーマンス改善
```

## Clean Architecture設計原則
- **責任分離**: 各層の独立性維持
- **依存性注入**: レイヤー間の疎結合
- **単一責任原則**: 1クラス1責任
- **DRY原則**: コード重複排除
- **開放閉鎖原則**: 拡張に開放、修正に閉鎖

## セキュリティ規約
- 外部通信禁止（完全オフライン）
- XSS対策実装必須
- 最小権限の原則遵守
- セキュリティ監査チェックリスト遵守