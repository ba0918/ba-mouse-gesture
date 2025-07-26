# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このリポジトリは、Chromeで動作するマウスジェスチャーツールのChrome拡張機能です。セキュリティを重視し、シンプルで直感的な操作性を目指しており、**Phase 3まで完了した本格的な拡張機能**です。

## プロジェクト構造

これは本格的なChrome拡張機能プロジェクトです。企業レベルの品質と保守性を備えています：

- `manifest.json` - 拡張機能のメタデータと権限設定（Manifest V3準拠）
- `content_scripts/` - Webページに注入されるスクリプト（ジェスチャー認識、軌跡表示）
- `background/` - バックグラウンドスクリプト（ブラウザ操作の実行）
- `popup/` - 拡張機能の設定画面（options.html/options.js）
- `assets/` - アイコンなどの静的ファイル
- `tests/` - 包括的テストスイート（単体/統合/E2E/パフォーマンス）

## 開発コマンド

完全な開発環境が整備済みです：

```bash
# 依存関係のインストール
pnpm install

# テスト実行（47テスト全パス）
pnpm test
pnpm run test:coverage
pnpm run test:watch

# E2Eテスト実行
pnpm run test:e2e

# リント実行（ESLint v9）
pnpm run lint
pnpm run lint:fix
```

## 技術要件

- **VanillaJS**（フレームワーク依存なし、軽量性重視）
- Chrome拡張機能 **Manifest V3準拠**
- 必要最小限の権限（activeTab, storage, tabs, scripting）
- 外部ライブラリへの依存は最小限に抑制
- **pnpm**によるパッケージ管理
- **Git-Flow**による開発フロー

## コア機能

### ジェスチャー認識
- 右クリック + マウス移動でジェスチャー開始
- 基本方向：上下左右
- 複合ジェスチャー：↓→、↑→、→↓

### アクション実行（全機能実装済み）
- ←: ブラウザの戻る
- →: ブラウザの進む  
- ↓: ページ最下部スクロール
- ↑: ページ最上部スクロール
- ↓→: タブを閉じる
- ↑→: 新しいタブを開く
- →↓: タブ更新

### 軌跡表示（カスタマイズ対応）
- ジェスチャー中にマウス軌跡を線で表示
- 色・太さのカスタマイズ可能
- リアルタイムプレビュー機能

### 設定機能（Phase 3完了）
- 拡張機能のON/OFF切り替え
- 軌跡の色・太さカスタマイズ
- 除外サイトリスト（URLパターンマッチング対応）
- 設定の永続化（chrome.storage API）

## 品質保証・セキュリティ

### テスト環境（100%完備）
- **単体テスト**: Jest（ジェスチャー検出、バックグラウンド、設定）
- **統合テスト**: コンポーネント間連携
- **E2Eテスト**: Playwright（実ブラウザ環境）
- **パフォーマンステスト**: 50ms以内レスポンス、10MB以下メモリ
- **カバレッジ**: 47テスト全パス

### セキュリティ（監査完了）
- 外部通信なし（完全オフライン動作）
- 最小権限の原則遵守
- XSS対策実装済み
- CSP準拠
- セキュリティチェックリスト完備（security-checklist.md）

## 開発体制

### Git-Flow運用
- **main**: 本番リリース用
- **develop**: 開発統合用
- **feature/**: 機能開発用
- **release/**: リリース準備用
- **hotfix/**: 緊急修正用

### 開発フロー
1. feature/ブランチで機能開発
2. プルリクエストでレビュー
3. developブランチに統合
4. リリース時にmainブランチにマージ・タグ付け

## GitHub連携

- **リポジトリ**: https://github.com/ba0918/ba-mouse-gesture.git
- **ブランチ保護**: main（直接プッシュ禁止）
- **CI/CD**: 準備中（TODO.md参照）
- **コミット規約**: Conventional Commits

## プロジェクト状況

- **Phase 0-3**: ✅ 100%完了
- **テスト**: ✅ 47/47パス
- **セキュリティ**: ✅ 監査完了
- **リリース**: ✅ v1.0.0