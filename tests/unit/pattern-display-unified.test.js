/**
 * パターン表示統一テストケース
 * GestureEntityとThinOptionsControllerで一貫した矢印表記処理をテスト
 */

describe('パターン表示統一テスト', () => {
  const { GestureEntity } = require('../../src/domain/entities/GestureEntity')
  
  // ThinOptionsControllerのインスタンス作成用
  let controller
  beforeEach(() => {
    document.body.innerHTML = '<div id="customGestureList"></div>'
    
    const mockUseCases = {
      customGestureUseCase: { getAllCustomGestures: jest.fn() },
      settingsUseCase: { toggleGesture: jest.fn() },
      gestureListUseCase: { getAllGestures: jest.fn() }
    }
    
    const { ThinOptionsController } = require('../../src/presentation/popup/ThinOptionsController')
    controller = new ThinOptionsController(mockUseCases)
  })

  describe('GesturePatternオブジェクト処理の統一', () => {
    const mockGesturePattern = {
      _directions: ['up', 'down', 'left', 'right'],
      _length: 4,
      toString: () => 'up→down→left→right'
    }

    test('GestureEntityで正しく矢印に変換される', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: mockGesturePattern,
        action: 'back'
      })

      expect(entity.getFormattedPattern()).toBe('↑↓←→')
      expect(entity.getDisplayPattern()).toBe('↑↓←→')
    })

    test('ThinOptionsControllerで正しく矢印に変換される', () => {
      const result = controller.formatPatternToArrows(mockGesturePattern)
      expect(result).toBe('↑↓←→')
    })

    test('両方で同じ結果が得られる', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: mockGesturePattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(mockGesturePattern)
      
      expect(entityResult).toBe(controllerResult)
      expect(entityResult).toBe('↑↓←→')
    })
  })

  describe('配列パターン処理の統一', () => {
    const arrayPattern = ['up', 'down', 'left', 'right']

    test('GestureEntityで正しく変換される', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: arrayPattern,
        action: 'back'
      })

      expect(entity.getFormattedPattern()).toBe('↑↓←→')
    })

    test('ThinOptionsControllerで正しく変換される', () => {
      const result = controller.formatPatternToArrows(arrayPattern)
      expect(result).toBe('↑↓←→')
    })

    test('両方で同じ結果が得られる', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: arrayPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(arrayPattern)
      
      expect(entityResult).toBe(controllerResult)
    })
  })

  describe('文字列パターン処理の統一', () => {
    test('既に矢印の文字列', () => {
      const arrowPattern = '↑↓←→'
      
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: arrowPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(arrowPattern)
      
      expect(entityResult).toBe('↑↓←→')
      expect(controllerResult).toBe('↑↓←→')
      expect(entityResult).toBe(controllerResult)
    })

    test('カンマ区切りの文字列', () => {
      const commaPattern = 'up,down,left,right'
      
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: commaPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(commaPattern)
      
      expect(entityResult).toBe('↑↓←→')
      expect(controllerResult).toBe('↑↓←→')
      expect(entityResult).toBe(controllerResult)
    })
  })

  describe('長いパターンの省略表示統一', () => {
    const longPattern = Array(12).fill('up') // 12個のup

    test('GestureEntityで省略される', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: longPattern,
        action: 'back'
      })

      const result = entity.getFormattedPattern(8)
      expect(result).toBe('↑↑↑↑↑↑↑…')
      expect(result.length).toBe(8)
    })

    test('ThinOptionsControllerで省略される', () => {
      const result = controller.formatPatternToArrows(longPattern, 8)
      expect(result).toBe('↑↑↑↑↑↑↑…')
      expect(result.length).toBe(8)
    })

    test('両方で同じ省略結果が得られる', () => {
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: longPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern(8)
      const controllerResult = controller.formatPatternToArrows(longPattern, 8)
      
      expect(entityResult).toBe(controllerResult)
      expect(entityResult.endsWith('…')).toBe(true)
    })
  })

  describe('エッジケース処理の統一', () => {
    test('空配列', () => {
      const emptyPattern = []
      
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: emptyPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(emptyPattern)
      
      expect(entityResult).toBe('')
      expect(controllerResult).toBe('')
      expect(entityResult).toBe(controllerResult)
    })

    test('null値', () => {
      const nullPattern = null
      
      const entity = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: nullPattern,
        action: 'back'
      })

      const entityResult = entity.getFormattedPattern()
      const controllerResult = controller.formatPatternToArrows(nullPattern)
      
      expect(entityResult).toBe('')
      expect(controllerResult).toBe('')
      expect(entityResult).toBe(controllerResult)
    })
  })
})