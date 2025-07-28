/**
 * ジェスチャーパターン表示テスト
 * 矢印表記統一と長いパターンの省略表示をテスト
 */

describe('ジェスチャーパターン表示', () => {
  const { GestureEntity } = require('../../src/domain/entities/GestureEntity')

  describe('基本的なパターン変換', () => {
    test('文字列パターンが矢印に変換される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: 'up,down,left,right',
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })

    test('配列パターンが矢印に変換される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })

    test('既に矢印の場合はそのまま返される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: '↑↓←→',
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })

    test('大文字小文字混在でも正しく変換される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['UP', 'down', 'LEFT', 'right'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })

    test('矢印と文字列の混在でも正しく変換される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['↑', 'down', '←', 'RIGHT'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })
  })

  describe('長いパターンの省略表示', () => {
    test('短いパターンはそのまま表示される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern(8)
      expect(result).toBe('↑↓')
    })

    test('長いパターンは省略される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right', 'up', 'down', 'left', 'right', 'up'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern(6)
      expect(result).toBe('↑↓←→↑…')
    })

    test('maxLengthが指定されない場合はデフォルト値を使用', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: Array(20).fill('up'), // 20個のup
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result.length).toBeLessThanOrEqual(12) // デフォルトは12
      expect(result.endsWith('…')).toBe(true)
    })

    test('getDisplayPatternでも省略表示が動作する', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right', 'up', 'down'],
        action: 'test'
      })

      const result = gesture.getDisplayPattern(4)
      expect(result).toBe('↑↓←…')
    })
  })

  describe('特殊ケース', () => {
    test('空のパターンは空文字を返す', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: [],
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('')
    })

    test('nullパターンは空文字を返す', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: null,
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('')
    })

    test('不明な方向文字列はそのまま返される', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'unknown', 'down'],
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑unknown↓')
    })

    test('文字列パターンでの複雑な変換', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: 'UPdownLEFTright',
        action: 'test'
      })

      const result = gesture.getFormattedPattern()
      expect(result).toBe('↑↓←→')
    })
  })

  describe('後方互換性', () => {
    test('getDisplayPatternとgetFormattedPatternの一貫性', () => {
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right'],
        action: 'test'
      })

      const display = gesture.getDisplayPattern(8)
      const formatted = gesture.getFormattedPattern(8)
      expect(display).toBe(formatted)
    })

    test('既存のジェスチャー一覧表示フォーマット', () => {
      // ジェスチャー一覧での大きい表示（6文字まで）
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right', 'up'],
        action: 'test'
      })

      const large = gesture.getFormattedPattern(6)
      const small = gesture.getFormattedPattern(12)
      
      expect(large).toBe('↑↓←→↑')
      expect(small).toBe('↑↓←→↑')

      // より長いパターンの場合
      const longGesture = new GestureEntity({
        id: 'test2',
        name: 'テスト2',
        pattern: Array(15).fill('up'), // 15個のupで15文字
        action: 'test'
      })

      const longLarge = longGesture.getFormattedPattern(6)
      const longSmall = longGesture.getFormattedPattern(12)
      
      expect(longLarge.endsWith('…')).toBe(true)
      expect(longSmall.endsWith('…')).toBe(true)
      expect(longLarge.length).toBe(6)
      expect(longSmall.length).toBe(12)
    })
  })
})