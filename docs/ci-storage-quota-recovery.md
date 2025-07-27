# GitHub Actions Storage Quota復旧手順

## 現在の状況

GitHub Actions storage quotaに達したため、アーティファクトアップロードを一時的に無効化中。

## 一時的に無効化した機能

- Playwrightテストレポートのアップロード
- Chrome拡張機能ビルドアーティファクトのアップロード

## 影響範囲

✅ **継続している機能**
- CI/CDパイプライン実行
- 全141テストの実行・検証
- ESLint静的解析
- Chrome拡張機能ビルド検証
- セキュリティ監査

⚠️ **一時停止している機能**
- テスト失敗時のPlaywrightレポート保存
- ビルド成果物のアーティファクト保存

## 復旧手順（6-12時間後）

### 1. ストレージ使用量の確認

GitHub リポジトリの Settings > Actions > General で使用量を確認

### 2. アーティファクトアップロードの再有効化

`.github/workflows/ci.yml`で以下のコメントアウトを解除：

```yaml
# 現在コメントアウト中の箇所
- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: failure() && matrix.node-version == '20.x'
  with:
    name: playwright-report-${{ github.run_number }}
    path: playwright-report/
    retention-days: 7

- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: extension-build-${{ github.run_number }}
    path: dist/
    retention-days: 7
```

### 3. コミット・プッシュ

```bash
git add .github/workflows/ci.yml
git commit -m "fix: GitHub Actions storage quota復旧 - アーティファクトアップロード再有効化"
git push origin develop
```

## 今後の対策

1. **retention-days短縮**: 7日→3日への更に短縮検討
2. **条件付きアップロード**: 重要なテスト失敗時のみアップロード
3. **定期クリーンアップ**: 古いアーティファクトの自動削除設定

## 参考リンク

- [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#calculating-minute-and-storage-spending)
- [Artifact retention policy](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)