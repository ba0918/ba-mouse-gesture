/**
 * Svelte コンポーネントのモック（Svelte 5対応）
 * テスト環境でSvelteコンポーネントを適切にモックする
 */

// Svelte 5の mount 関数のモック
const mount = () => ({
  destroy: () => {},
  $set: () => {},
  $on: () => {},
  $$: { fragment: null, props: {} }
})

// Svelteコンポーネントのコンストラクタをモック
function SvelteComponentMock(options = {}) {
  // Svelteコンポーネントの基本的なAPIをモック
  return {
    // DOM要素への参照（必要に応じて）
    $$: {
      fragment: null,
      ctx: [],
      props: options.props || {}
    },
    
    // プロパティ設定
    $set: () => {},
    
    // イベントリスナー
    $on: () => {},
    
    // コンポーネント破棄
    $destroy: () => {},
    
    // オプションの保存（テスト用）
    _options: options
  }
}

// Svelte 5の関数群のモック
const createEventDispatcher = () => () => {}
const onMount = (fn) => fn && fn()
const onDestroy = () => {}
const tick = () => Promise.resolve()

// 複数のエクスポート形式をサポート
module.exports = SvelteComponentMock
module.exports.default = SvelteComponentMock
module.exports.mount = mount
module.exports.createEventDispatcher = createEventDispatcher
module.exports.onMount = onMount
module.exports.onDestroy = onDestroy
module.exports.tick = tick

// トランスフォーム関数（Jest transform用）
module.exports.process = (src, filename) => {
  const componentName = filename.split('/').pop().replace('.svelte', '')
  return {
    code: `
      const SvelteComponentMock = require(__filename);
      function ${componentName}Mock(options) {
        return new SvelteComponentMock(options);
      }
      module.exports = ${componentName}Mock;
      module.exports.default = ${componentName}Mock;
    `
  }
}