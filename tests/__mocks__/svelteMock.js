/**
 * Svelte コンポーネントのモック
 * テスト環境でSvelteコンポーネントを適切にモックする
 */

// Svelteコンポーネントのコンストラクタをモック
function SvelteComponentMock(options) {
  // Svelteコンポーネントの基本的なAPIをモック
  return {
    // DOM要素への参照（必要に応じて）
    $$: {
      fragment: null,
      ctx: [],
      props: {}
    },
    
    // プロパティ設定
    $set: jest.fn(),
    
    // イベントリスナー
    $on: jest.fn(),
    
    // コンポーネント破棄
    $destroy: jest.fn(),
    
    // オプションの保存（テスト用）
    _options: options
  }
}

// デフォルトエクスポート
module.exports = SvelteComponentMock