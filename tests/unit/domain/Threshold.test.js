/**
 * Threshold 値オブジェクト単体テスト
 */

const { Threshold } = require('../../../src/domain/valueObjects/Threshold')

describe('Threshold Value Object', () => {
  describe('Constructor', () => {
    test('should create threshold with default values', () => {
      const threshold = new Threshold()
      expect(threshold.getDetectionThreshold()).toBe(15)
      expect(threshold.getMatchThreshold()).toBe(0.6)
      expect(threshold.getConfidenceThreshold()).toBe(0.5)
    })

    test('should create threshold with custom values', () => {
      const threshold = new Threshold(20, 0.8, 0.7)
      expect(threshold.getDetectionThreshold()).toBe(20)
      expect(threshold.getMatchThreshold()).toBe(0.8)
      expect(threshold.getConfidenceThreshold()).toBe(0.7)
    })

    test('should throw error for invalid detection threshold', () => {
      expect(() => new Threshold(0)).toThrow()
      expect(() => new Threshold(300)).toThrow()
      expect(() => new Threshold('invalid')).toThrow()
    })

    test('should throw error for invalid match threshold', () => {
      expect(() => new Threshold(15, -0.1)).toThrow()
      expect(() => new Threshold(15, 1.1)).toThrow()
      expect(() => new Threshold(15, 'invalid')).toThrow()
    })

    test('should throw error for invalid confidence threshold', () => {
      expect(() => new Threshold(15, 0.6, -0.1)).toThrow()
      expect(() => new Threshold(15, 0.6, 1.1)).toThrow()
      expect(() => new Threshold(15, 0.6, 'invalid')).toThrow()
    })

    test('should be immutable', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      // オブジェクトがfreezeされていることを確認
      expect(Object.isFrozen(threshold)).toBe(true)
      
      // プロパティが変更できないことを確認（silent fail）
      threshold._detectionThreshold = 100
      expect(threshold.getDetectionThreshold()).toBe(15) // 元の値のまま
    })
  })

  describe('Detection methods', () => {
    test('should detect when distance exceeds threshold', () => {
      const threshold = new Threshold(15)
      expect(threshold.isDetectable(20)).toBe(true)
      expect(threshold.isDetectable(15)).toBe(true)
      expect(threshold.isDetectable(10)).toBe(false)
    })

    test('should match when similarity exceeds threshold', () => {
      const threshold = new Threshold(15, 0.6)
      expect(threshold.isMatch(0.8)).toBe(true)
      expect(threshold.isMatch(0.6)).toBe(true)
      expect(threshold.isMatch(0.4)).toBe(false)
    })

    test('should be confident when confidence exceeds threshold', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      expect(threshold.isConfident(0.7)).toBe(true)
      expect(threshold.isConfident(0.5)).toBe(true)
      expect(threshold.isConfident(0.3)).toBe(false)
    })
  })

  describe('Sensitivity levels', () => {
    test('should classify sensitivity levels correctly', () => {
      const high = new Threshold(8)
      const medium = new Threshold(15)
      const low = new Threshold(30)
      
      expect(high.getSensitivityLevel()).toBe('high')
      expect(medium.getSensitivityLevel()).toBe('medium')
      expect(low.getSensitivityLevel()).toBe('low')
    })

    test('should classify matching levels correctly', () => {
      const loose = new Threshold(15, 0.3)
      const normal = new Threshold(15, 0.6)
      const strict = new Threshold(15, 0.8)
      
      expect(loose.getMatchingLevel()).toBe('loose')
      expect(normal.getMatchingLevel()).toBe('normal')
      expect(strict.getMatchingLevel()).toBe('strict')
    })
  })

  describe('Adaptive adjustment', () => {
    test('should not adjust with insufficient data', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adapted = threshold.adapt(0.8, 3)
      
      expect(adapted.equals(threshold)).toBe(true)
    })

    test('should increase thresholds for high success rate', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adapted = threshold.adapt(0.95, 10)
      
      expect(adapted.getMatchThreshold()).toBeGreaterThan(threshold.getMatchThreshold())
      expect(adapted.getConfidenceThreshold()).toBeGreaterThan(threshold.getConfidenceThreshold())
    })

    test('should decrease thresholds for low success rate', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adapted = threshold.adapt(0.4, 10)
      
      expect(adapted.getMatchThreshold()).toBeLessThan(threshold.getMatchThreshold())
      expect(adapted.getConfidenceThreshold()).toBeLessThan(threshold.getConfidenceThreshold())
    })

    test('should not change thresholds for medium success rate', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adapted = threshold.adapt(0.75, 10)
      
      expect(adapted.getMatchThreshold()).toBeCloseTo(threshold.getMatchThreshold())
      expect(adapted.getConfidenceThreshold()).toBeCloseTo(threshold.getConfidenceThreshold())
    })
  })

  describe('User adjustment', () => {
    test('should adjust for high sensitivity', () => {
      const threshold = new Threshold(20, 0.6, 0.5)
      const adjusted = threshold.adjustForUser('high', 'normal')
      
      expect(adjusted.getDetectionThreshold()).toBeLessThan(threshold.getDetectionThreshold())
    })

    test('should adjust for low sensitivity', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adjusted = threshold.adjustForUser('low', 'normal')
      
      expect(adjusted.getDetectionThreshold()).toBeGreaterThan(threshold.getDetectionThreshold())
    })

    test('should adjust for loose accuracy', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adjusted = threshold.adjustForUser('medium', 'loose')
      
      expect(adjusted.getMatchThreshold()).toBeLessThan(threshold.getMatchThreshold())
    })

    test('should adjust for strict accuracy', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const adjusted = threshold.adjustForUser('medium', 'strict')
      
      expect(adjusted.getMatchThreshold()).toBeGreaterThan(threshold.getMatchThreshold())
    })
  })

  describe('Device adjustment', () => {
    test('should adjust for high DPI device', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const deviceInfo = { devicePixelRatio: 3, isTouchDevice: false }
      const adjusted = threshold.adjustForDevice(deviceInfo)
      
      expect(adjusted.getDetectionThreshold()).toBeGreaterThan(threshold.getDetectionThreshold())
    })

    test('should adjust for touch device', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const deviceInfo = { devicePixelRatio: 1, isTouchDevice: true }
      const adjusted = threshold.adjustForDevice(deviceInfo)
      
      expect(adjusted.getDetectionThreshold()).toBeGreaterThan(threshold.getDetectionThreshold())
    })
  })

  describe('Threshold manipulation', () => {
    test('should make threshold stricter', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const stricter = threshold.makeStricter(1.2)
      
      expect(stricter.getMatchThreshold()).toBeGreaterThan(threshold.getMatchThreshold())
      expect(stricter.getConfidenceThreshold()).toBeGreaterThan(threshold.getConfidenceThreshold())
    })

    test('should make threshold looser', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const looser = threshold.makeLoose(0.8)
      
      expect(looser.getMatchThreshold()).toBeLessThan(threshold.getMatchThreshold())
      expect(looser.getConfidenceThreshold()).toBeLessThan(threshold.getConfidenceThreshold())
    })

    test('should cap thresholds at valid ranges', () => {
      const threshold = new Threshold(15, 0.9, 0.9)
      const stricter = threshold.makeStricter(2.0)
      
      expect(stricter.getMatchThreshold()).toBeLessThanOrEqual(1.0)
      expect(stricter.getConfidenceThreshold()).toBeLessThanOrEqual(1.0)
    })
  })

  describe('Equality and validation', () => {
    test('should check equality with epsilon', () => {
      const t1 = new Threshold(15.0000001, 0.6000001, 0.5000001)
      const t2 = new Threshold(15.0000002, 0.6000002, 0.5000002)
      
      expect(t1.equals(t2, 1e-5)).toBe(true)
      expect(t1.equals(t2, 1e-8)).toBe(false)
    })

    test('should validate threshold values', () => {
      const valid = new Threshold(15, 0.6, 0.5)
      expect(valid.isValid()).toBe(true)
    })

    test('should not equal non-threshold objects', () => {
      const threshold = new Threshold()
      expect(threshold.equals('not-threshold')).toBe(false)
      expect(threshold.equals(null)).toBe(false)
    })
  })

  describe('Serialization', () => {
    test('should convert to string', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const str = threshold.toString()
      
      expect(str).toContain('15px')
      expect(str).toContain('0.6')
      expect(str).toContain('0.5')
    })

    test('should convert to JSON', () => {
      const threshold = new Threshold(15, 0.6, 0.5)
      const json = threshold.toJSON()
      
      expect(json).toEqual({
        detectionThreshold: 15,
        matchThreshold: 0.6,
        confidenceThreshold: 0.5
      })
    })

    test('should create from JSON', () => {
      const json = {
        detectionThreshold: 20,
        matchThreshold: 0.8,
        confidenceThreshold: 0.7
      }
      const threshold = Threshold.fromJSON(json)
      
      expect(threshold.getDetectionThreshold()).toBe(20)
      expect(threshold.getMatchThreshold()).toBe(0.8)
      expect(threshold.getConfidenceThreshold()).toBe(0.7)
    })
  })

  describe('Static factory methods', () => {
    test('should create default threshold', () => {
      const threshold = Threshold.getDefault()
      expect(threshold.getDetectionThreshold()).toBe(15)
      expect(threshold.getMatchThreshold()).toBe(0.6)
      expect(threshold.getConfidenceThreshold()).toBe(0.5)
    })

    test('should create high sensitivity threshold', () => {
      const threshold = Threshold.getHighSensitivity()
      expect(threshold.getDetectionThreshold()).toBeLessThan(15)
      expect(threshold.getMatchThreshold()).toBeLessThan(0.6)
    })

    test('should create high accuracy threshold', () => {
      const threshold = Threshold.getHighAccuracy()
      expect(threshold.getDetectionThreshold()).toBeGreaterThan(15)
      expect(threshold.getMatchThreshold()).toBeGreaterThan(0.6)
    })

    test('should create custom gesture threshold', () => {
      const threshold = Threshold.getForCustomGesture()
      expect(threshold.getDetectionThreshold()).toBe(12)
      expect(threshold.getMatchThreshold()).toBe(0.65)
      expect(threshold.getConfidenceThreshold()).toBe(0.6)
    })
  })
})