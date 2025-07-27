/**
 * Point 値オブジェクト単体テスト
 */

const { Point } = require('../../../src/domain/valueObjects/Point')

describe('Point Value Object', () => {
  describe('Constructor', () => {
    test('should create point with valid coordinates', () => {
      const point = new Point(10, 20)
      expect(point.x).toBe(10)
      expect(point.y).toBe(20)
    })

    test('should throw error for invalid coordinates', () => {
      expect(() => new Point(NaN, 10)).toThrow()
      expect(() => new Point(10, Infinity)).toThrow()
      expect(() => new Point('invalid', 10)).toThrow()
    })

    test('should be immutable', () => {
      const point = new Point(5, 15)
      // オブジェクトがfreezeされていることを確認
      expect(Object.isFrozen(point)).toBe(true)
      
      // プロパティが変更できないことを確認（silent fail）
      point.x = 100
      point.y = 200
      expect(point.x).toBe(5) // 元の値のまま
      expect(point.y).toBe(15) // 元の値のまま
    })
  })

  describe('Distance calculations', () => {
    test('should calculate distance to another point', () => {
      const p1 = new Point(0, 0)
      const p2 = new Point(3, 4)
      expect(p1.distanceTo(p2)).toBe(5) // 3-4-5 triangle
    })

    test('should calculate distance to same point as zero', () => {
      const point = new Point(10, 20)
      expect(point.distanceTo(point)).toBe(0)
    })

    test('should throw error for invalid argument', () => {
      const point = new Point(0, 0)
      expect(() => point.distanceTo('invalid')).toThrow()
    })
  })

  describe('Angle calculations', () => {
    test('should calculate angle to another point', () => {
      const p1 = new Point(0, 0)
      const p2 = new Point(1, 0) // right
      expect(p1.angleTo(p2)).toBeCloseTo(0)
      
      const p3 = new Point(0, 1) // down
      expect(p1.angleTo(p3)).toBeCloseTo(Math.PI / 2)
    })

    test('should calculate direction vector', () => {
      const p1 = new Point(0, 0)
      const p2 = new Point(10, 0)
      const direction = p1.directionTo(p2)
      
      expect(direction.x).toBeCloseTo(1)
      expect(direction.y).toBeCloseTo(0)
    })
  })

  describe('Transformations', () => {
    test('should translate point', () => {
      const point = new Point(5, 10)
      const translated = point.translate(3, -2)
      
      expect(translated.x).toBe(8)
      expect(translated.y).toBe(8)
      expect(point.x).toBe(5) // original unchanged
    })

    test('should rotate point', () => {
      const point = new Point(1, 0)
      const rotated = point.rotate(Math.PI / 2) // 90 degrees
      
      expect(rotated.x).toBeCloseTo(0)
      expect(rotated.y).toBeCloseTo(1)
    })

    test('should scale point', () => {
      const point = new Point(3, 4)
      const scaled = point.scale(2)
      
      expect(scaled.x).toBe(6)
      expect(scaled.y).toBe(8)
    })
  })

  describe('Utility methods', () => {
    test('should calculate magnitude', () => {
      const point = new Point(3, 4)
      expect(point.magnitude()).toBe(5)
    })

    test('should normalize to unit vector', () => {
      const point = new Point(3, 4)
      const normalized = point.normalize()
      
      expect(normalized.magnitude()).toBeCloseTo(1)
      expect(normalized.x).toBeCloseTo(0.6)
      expect(normalized.y).toBeCloseTo(0.8)
    })

    test('should round coordinates', () => {
      const point = new Point(3.7, 4.2)
      const rounded = point.round()
      
      expect(rounded.x).toBe(4)
      expect(rounded.y).toBe(4)
    })
  })

  describe('Equality and validation', () => {
    test('should check equality with epsilon', () => {
      const p1 = new Point(1.0000001, 2.0000001)
      const p2 = new Point(1.0000002, 2.0000002)
      
      expect(p1.equals(p2, 1e-6)).toBe(true)
      expect(p1.equals(p2, 1e-8)).toBe(false)
    })

    test('should validate point', () => {
      const validPoint = new Point(10, 20)
      expect(validPoint.isValid()).toBe(true)
      
      // Invalid points should not be creatable
      expect(() => new Point(NaN, 10)).toThrow()
    })
  })

  describe('Static methods', () => {
    test('should create origin point', () => {
      const origin = Point.origin()
      expect(origin.x).toBe(0)
      expect(origin.y).toBe(0)
    })

    test('should calculate midpoint', () => {
      const p1 = new Point(0, 0)
      const p2 = new Point(10, 20)
      const mid = Point.midpoint(p1, p2)
      
      expect(mid.x).toBe(5)
      expect(mid.y).toBe(10)
    })

    test('should calculate distance between points', () => {
      const p1 = new Point(0, 0)
      const p2 = new Point(3, 4)
      expect(Point.distance(p1, p2)).toBe(5)
    })
  })

  describe('Serialization', () => {
    test('should convert to JSON', () => {
      const point = new Point(10, 20)
      const json = point.toJSON()
      
      expect(json).toEqual({ x: 10, y: 20 })
    })

    test('should convert to array', () => {
      const point = new Point(10, 20)
      const array = point.toArray()
      
      expect(array).toEqual([10, 20])
    })

    test('should create from JSON', () => {
      const json = { x: 10, y: 20 }
      const point = Point.fromJSON(json)
      
      expect(point.x).toBe(10)
      expect(point.y).toBe(20)
    })

    test('should create from array', () => {
      const array = [10, 20]
      const point = Point.fromArray(array)
      
      expect(point.x).toBe(10)
      expect(point.y).toBe(20)
    })

    test('should throw error for invalid array', () => {
      expect(() => Point.fromArray([10])).toThrow()
      expect(() => Point.fromArray([10, 20, 30])).toThrow()
    })
  })

  describe('String representation', () => {
    test('should convert to string', () => {
      const point = new Point(10, 20)
      expect(point.toString()).toBe('Point(10, 20)')
    })
  })
})