# OptionsApp.svelte リファクタリング計画

## 現状の問題点
- **OptionsApp.svelte**: 1772行の巨大なファイル（ファットモデル）
- すべてのUI要素と状態管理が1つのファイルに集中
- コンポーネント化されていない
- 保守性・再利用性が低い

## ⚠️ 重要な注意事項
- **components/ディレクトリの既存コンポーネントは使用しない**
- OptionsApp.svelteとcomponents以下のUIは全く別物
- **OptionsApp.svelteの現在のUIデザインを完全に維持する**
- 既存のスタイルやレイアウトを変更しない

## リファクタリング方針
OptionsApp.svelteの既存UIを維持したまま、新規コンポーネントに分割する。

## 新規コンポーネント構成（OptionsApp.svelteのUIを維持）

### 1. OptionsBasicSettings.svelte（新規作成）
- **責務**: 基本設定（有効/無効切り替え）
- **UI**: OptionsApp.svelteの基本設定セクションをそのまま移植
- **Props**:
  - `enabled`: マウスジェスチャーの有効/無効
  - `isLoading`: ローディング状態
  - `onEnabledChange`: 有効/無効変更ハンドラー

### 2. OptionsTrackSettings.svelte（新規作成）
- **責務**: 軌跡設定（色、太さ、感度）
- **UI**: OptionsApp.svelteの軌跡設定セクションをそのまま移植
- **Props**:
  - `strokeColor`: 軌跡の色
  - `strokeWidth`: 軌跡の太さ
  - `gestureThreshold`: ジェスチャー感度
  - `isLoading`: ローディング状態
  - ハンドラー関数群

### 3. OptionsDebugSettings.svelte（新規作成）
- **責務**: デバッグ設定の管理
- **UI**: OptionsApp.svelteのデバッグ設定セクションをそのまま移植
- **特徴**: 現在のUIレイアウトとスタイルを完全維持

### 4. OptionsCustomGestures.svelte（新規作成）
- **責務**: カスタムジェスチャーの作成・管理
- **UI**: OptionsApp.svelteのカスタムジェスチャーセクションをそのまま移植
- **特徴**: 既存の方向ボタンUIを維持

### 5. OptionsExcludeList.svelte（新規作成）
- **責務**: 除外サイトリストの管理
- **UI**: OptionsApp.svelteの除外サイトセクションをそのまま移植

### 6. OptionsGestureList.svelte（新規作成）
- **責務**: 全ジェスチャー一覧の表示
- **UI**: OptionsApp.svelteのジェスチャー一覧セクションをそのまま移植

## 実装手順

### Phase 1: 準備作業
1. ✅ feature/refactor-options-componentsブランチ作成
2. ❌ ~~BasicSettings.svelteをSvelte 5対応に改修~~ （既存コンポーネントは使用しない）
3. ✅ OptionsApp.svelteにコンポーネント用ハンドラー関数追加

### Phase 2: 新規コンポーネント作成（現在作業中）
1. OptionsApp.svelteから各セクションのHTMLとスタイルを抽出
2. 新規コンポーネントファイルを作成（Options〜.svelte）
3. 既存のUIとスタイルを完全に維持したまま移植

### Phase 3: 状態管理の整理
1. 各コンポーネントで必要な状態のみを保持
2. 親コンポーネント（OptionsApp）で全体の状態を管理
3. イベントハンドリングの統一

### Phase 4: テストとビルド
1. 各コンポーネントの動作確認
2. ビルドエラーの解消
3. E2Eテストの実行

### Phase 5: クリーンアップ
1. 未使用のコードの削除
2. コメントアウトされたコードの整理
3. TypeScript型定義の改善

## 技術的な考慮事項

### Svelte 5対応
- `$state()`を使用したリアクティブ状態管理
- `$bindable()`を使用した双方向バインディング
- `$props()`を使用したProps定義

### イベント通信
- 既存コンポーネント: createEventDispatcher使用
- 新規コンポーネント: コールバック関数をPropsで渡す方式

### スタイリング
- 各コンポーネントで独立したスタイル定義
- 共通スタイルの抽出は後回し

## 期待される効果
1. **保守性向上**: 各機能が独立したコンポーネントに
2. **再利用性向上**: コンポーネント単位での再利用が可能
3. **可読性向上**: 1ファイル300行以下を目指す
4. **テスタビリティ向上**: コンポーネント単位でのテストが容易に

## 注意事項
- 既存の機能を壊さないよう段階的に実装
- 各ステップでビルドとテストを実行
- ServiceFactoryとの連携を維持
- Chrome Extension APIとの互換性を保つ