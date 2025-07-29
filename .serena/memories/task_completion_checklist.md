# タスク完了時チェックリスト

## 必須実行コマンド
```bash
# 1. リント実行（自動修正付き）
pnpm run lint:fix

# 2. 型チェック実行
pnpm run typecheck

# 3. 全テスト実行
pnpm test

# 4. カバレッジ確認
pnpm run test:coverage

# 5. ビルド確認
pnpm run build
```

## 品質ゲート確認
- **pre-commit**: `git commit` で自動実行
  - ESLint + 関連テスト実行
  - TODO.md状態チェック
- **pre-push**: `git push` で自動実行
  - 全368テストスイート実行

## TDD実践チェック
- [ ] 新機能にはテストファースト実装
- [ ] 既存テストの成功維持（368テスト）
- [ ] カバレッジの維持・向上

## Clean Architecture設計確認
- [ ] 依存性の方向性確認（外側→内側）
- [ ] レイヤー間の疎結合維持
- [ ] 単一責任原則の遵守

## セキュリティチェック
- [ ] 外部通信なし（オフライン動作）
- [ ] 最小権限の原則遵守
- [ ] XSS対策実装

## コミット規約
```bash
# 機能完了時の自発的コミット例
git commit -m "feat: 新機能実装完了

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## TODO.md更新
- [ ] 作業開始時: `in_progress`に変更
- [ ] 作業完了時: `completed`に変更 + 実績記録
- [ ] TodoWriteツールでの自動更新