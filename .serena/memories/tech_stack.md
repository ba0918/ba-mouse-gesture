# 技術スタック

## 言語・フレームワーク
- **JavaScript**: メイン言語（VanillaJS）
- **TypeScript**: 型安全性向上（厳密な型チェック設定）
- **Svelte**: UI コンポーネント（オプション画面）
- **HTML5/CSS3**: UI基盤

## アーキテクチャ
- **Clean Architecture**: 4層構成
  - Domain層: エンティティ、値オブジェクト、ドメインサービス
  - Application層: ユースケース、アプリケーションサービス
  - Infrastructure層: アダプター、リポジトリ実装
  - Presentation層: UI、コントローラー

## ビルド・開発ツール
- **esbuild**: 高速バンドラー（0.12MB出力）
- **pnpm**: パッケージマネージャー
- **ESLint v9**: 静的解析（フラット設定）
- **Jest**: 単体テスト（368テスト）
- **Playwright**: E2Eテスト
- **Husky**: Gitフック（品質ゲート）
- **lint-staged**: 差分ファイル処理

## Chrome拡張機能関連
- **Manifest V3**: 最新仕様準拠
- **Chrome APIs**: storage, tabs, scripting, activeTab
- **Service Worker**: バックグラウンド処理
- **Content Scripts**: ページ内処理

## CI/CD
- **GitHub Actions**: 自動テスト・ビルド・リリース
- **自動依存関係更新**: Dependabot
- **品質ゲート**: pre-commit（lint+test）、pre-push（全テスト）