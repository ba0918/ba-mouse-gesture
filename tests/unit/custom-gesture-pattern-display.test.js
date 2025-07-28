/**
 * カスタムジェスチャーパターン表示統一テスト
 * ThinOptionsControllerのformatPatternToArrowsメソッドをテスト
 */

describe('カスタムジェスチャーパターン表示統一', () => {
  let controller

  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="allGesturesList"></div>
      <div id="customGestureList"></div>
      <div id="saveStatus" style="display: none;"></div>
    `

    // Mock UseCases
    const mockUseCases = {
      customGestureUseCase: { getAllCustomGestures: jest.fn() },
      settingsUseCase: { toggleGesture: jest.fn() },
      gestureListUseCase: { getAllGestures: jest.fn() }
    }

    // ThinOptionsController
    const { ThinOptionsController } = require('../../src/presentation/popup/ThinOptionsController')
    controller = new ThinOptionsController(mockUseCases)
  })

  describe('formatPatternToArrows メソッド', () => {
    test('配列パターンが矢印に変換される', () => {
      const result = controller.formatPatternToArrows(['up', 'down', 'left', 'right'])
      expect(result).toBe('↑↓←→')
    })

    test('既に矢印の配列はそのまま処理される', () => {
      const result = controller.formatPatternToArrows(['↑', '↓', '←', '→'])
      expect(result).toBe('↑↓←→')
    })

    test('混在パターンが正しく変換される', () => {
      const result = controller.formatPatternToArrows(['↑', 'down', '←', 'RIGHT'])
      expect(result).toBe('↑↓←→')
    })

    test('文字列パターン（カンマ区切り）が変換される', () => {
      const result = controller.formatPatternToArrows('up,down,left,right')
      expect(result).toBe('↑↓←→')
    })

    test('文字列パターン（連続）が変換される', () => {
      const result = controller.formatPatternToArrows('updownleftright')
      expect(result).toBe('↑↓←→')
    })

    test('既に矢印の文字列はそのまま返される', () => {
      const result = controller.formatPatternToArrows('↑↓←→')
      expect(result).toBe('↑↓←→')
    })

    test('長いパターンは省略される', () => {
      const longPattern = Array(10).fill('up')
      const result = controller.formatPatternToArrows(longPattern, 6)
      expect(result).toBe('↑↑↑↑↑…')
      expect(result.length).toBe(6)
    })

    test('短いパターンは省略されない', () => {
      const result = controller.formatPatternToArrows(['up', 'down'], 8)
      expect(result).toBe('↑↓')
    })

    test('空のパターンは空文字を返す', () => {
      expect(controller.formatPatternToArrows([])).toBe('')
      expect(controller.formatPatternToArrows('')).toBe('')
      expect(controller.formatPatternToArrows(null)).toBe('')
    })
  })

  describe('directionToArrow メソッド', () => {
    test('基本的な方向文字列が変換される', () => {
      expect(controller.directionToArrow('up')).toBe('↑')
      expect(controller.directionToArrow('down')).toBe('↓')
      expect(controller.directionToArrow('left')).toBe('←')
      expect(controller.directionToArrow('right')).toBe('→')
    })

    test('大文字でも変換される', () => {
      expect(controller.directionToArrow('UP')).toBe('↑')
      expect(controller.directionToArrow('DOWN')).toBe('↓')
      expect(controller.directionToArrow('LEFT')).toBe('←')
      expect(controller.directionToArrow('RIGHT')).toBe('→')
    })

    test('既に矢印の場合はそのまま返される', () => {
      expect(controller.directionToArrow('↑')).toBe('↑')
      expect(controller.directionToArrow('↓')).toBe('↓')
      expect(controller.directionToArrow('←')).toBe('←')
      expect(controller.directionToArrow('→')).toBe('→')
    })

    test('不明な方向はそのまま返される', () => {
      expect(controller.directionToArrow('unknown')).toBe('unknown')
      expect(controller.directionToArrow('test')).toBe('test')
    })
  })

  describe('getActionDisplayName メソッド', () => {
    test('基本的なアクション名が日本語に変換される', () => {
      expect(controller.getActionDisplayName('back')).toBe('ブラウザの戻る')
      expect(controller.getActionDisplayName('forward')).toBe('ブラウザの進む')
      expect(controller.getActionDisplayName('new_tab')).toBe('新しいタブを開く')
      expect(controller.getActionDisplayName('close_tab')).toBe('タブを閉じる')
    })

    test('Phase 10新機能のアクション名が変換される', () => {
      expect(controller.getActionDisplayName('super_refresh')).toBe('スーパーリロード（キャッシュクリア付き）')
      expect(controller.getActionDisplayName('prev_tab')).toBe('前のタブに切り替え')
      expect(controller.getActionDisplayName('next_tab')).toBe('次のタブに切り替え')
    })

    test('不明なアクションはそのまま返される', () => {
      expect(controller.getActionDisplayName('unknown_action')).toBe('unknown_action')
      expect(controller.getActionDisplayName('custom_action')).toBe('custom_action')
    })
  })

  describe('統合テスト', () => {
    test('buildCustomGestureListHTMLで矢印表記が使用される', () => {
      const mockGestures = [
        {
          id: 'custom_test_123',
          name: 'テストジェスチャー',
          pattern: ['up', 'down', 'left', 'right'],
          action: 'back',
          enabled: true
        }
      ]

      const html = controller.buildCustomGestureListHTML(mockGestures)
      
      // HTMLに矢印が含まれていることを確認
      expect(html).toContain('↑↓←→')
      expect(html).toContain('ブラウザの戻る')
      expect(html).toContain('テストジェスチャー')
    })

    test('長いパターンのカスタムジェスチャーで省略表示される', () => {
      const mockGestures = [
        {
          id: 'custom_long_456',
          name: '長いジェスチャー',
          pattern: Array(12).fill('up'), // 12個のup
          action: 'new_tab',
          enabled: true
        }
      ]

      const html = controller.buildCustomGestureListHTML(mockGestures)
      
      // 省略記号が含まれていることを確認（8文字制限）
      expect(html).toContain('…')
      expect(html).toContain('新しいタブを開く')
    })

    test('無効なカスタムジェスチャーにdisabledクラスが付与される', () => {
      const mockGestures = [
        {
          id: 'custom_disabled_789',
          name: '無効ジェスチャー',
          pattern: ['up', 'down'],
          action: 'refresh',
          enabled: false
        }
      ]

      const html = controller.buildCustomGestureListHTML(mockGestures)
      
      expect(html).toContain('gesture-item disabled')
      expect(html).toContain('↑↓')
      expect(html).toContain('ページ更新')
    })
  })
})