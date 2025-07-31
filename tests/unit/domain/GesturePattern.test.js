/**
 * GesturePattern 値オブジェクト単体テスト
 */

const { GesturePattern } = require('../../../src/domain/valueObjects/GesturePattern');
const { Threshold } = require('../../../src/domain/valueObjects/Threshold');

describe('GesturePattern Value Object', () => {
  describe('Constructor', () => {
    test('should create pattern with valid directions', () => {
      const pattern = new GesturePattern(['↑', '→', '↓']);
      expect(pattern.getDirections()).toEqual(['↑', '→', '↓']);
      expect(pattern.getLength()).toBe(3);
    });

    test('should throw error for invalid directions', () => {
      expect(() => new GesturePattern(['↑', 'invalid', '↓'])).toThrow();
      expect(() => new GesturePattern('not-array')).toThrow();
    });

    test('should be immutable', () => {
      const pattern = new GesturePattern(['↑', '↓']);
      const directions = pattern.getDirections();

      directions.push('←');
      expect(pattern.getLength()).toBe(2); // unchanged
    });
  });

  describe('Pattern properties', () => {
    test('should identify empty pattern', () => {
      const empty = new GesturePattern([]);
      expect(empty.isEmpty()).toBe(true);
      expect(empty.isSimple()).toBe(false);
      expect(empty.isComplex()).toBe(false);
    });

    test('should identify simple pattern', () => {
      const simple = new GesturePattern(['↑']);
      expect(simple.isSimple()).toBe(true);
      expect(simple.isComplex()).toBe(false);
    });

    test('should identify complex pattern', () => {
      const complex = new GesturePattern(['↑', '→', '↓']);
      expect(complex.isSimple()).toBe(false);
      expect(complex.isComplex()).toBe(true);
    });

    test('should get first and last directions', () => {
      const pattern = new GesturePattern(['↑', '→', '↓']);
      expect(pattern.getFirst()).toBe('↑');
      expect(pattern.getLast()).toBe('↓');
    });
  });

  describe('Exact matching', () => {
    test('should match identical patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '→']);
      expect(p1.exactMatch(p2)).toBe(true);
    });

    test('should not match different patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '↓']);
      expect(p1.exactMatch(p2)).toBe(false);
    });

    test('should not match different length patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑']);
      expect(p1.exactMatch(p2)).toBe(false);
    });
  });

  describe('Similarity calculation', () => {
    test('should calculate perfect similarity for identical patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '→']);
      expect(p1.calculateSimilarity(p2)).toBe(1.0);
    });

    test('should calculate zero similarity for completely different patterns', () => {
      const p1 = new GesturePattern(['↑']);
      const p2 = new GesturePattern(['↓']);
      expect(p1.calculateSimilarity(p2)).toBe(0.0);
    });

    test('should calculate partial similarity', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '↓']);
      const similarity = p1.calculateSimilarity(p2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    test('should handle empty patterns', () => {
      const empty = new GesturePattern([]);
      const pattern = new GesturePattern(['↑']);

      expect(empty.calculateSimilarity(empty)).toBe(1.0);
      expect(empty.calculateSimilarity(pattern)).toBe(0.0);
    });
  });

  describe('Levenshtein distance', () => {
    test('should calculate zero distance for identical patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '→']);
      expect(p1.levenshteinDistance(p2)).toBe(0);
    });

    test('should calculate correct distance for different patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '↓']);
      expect(p1.levenshteinDistance(p2)).toBe(1);
    });

    test('should calculate distance for different length patterns', () => {
      const p1 = new GesturePattern(['↑']);
      const p2 = new GesturePattern(['↑', '→', '↓']);
      expect(p1.levenshteinDistance(p2)).toBe(2);
    });
  });

  describe('Longest Common Subsequence', () => {
    test('should find complete LCS for identical patterns', () => {
      const p1 = new GesturePattern(['↑', '→', '↓']);
      const p2 = new GesturePattern(['↑', '→', '↓']);
      const lcs = p1.longestCommonSubsequence(p2);

      expect(lcs.getLength()).toBe(3);
      expect(lcs.exactMatch(p1)).toBe(true);
    });

    test('should find partial LCS', () => {
      const p1 = new GesturePattern(['↑', '→', '↓']);
      const p2 = new GesturePattern(['↑', '←', '↓']);
      const lcs = p1.longestCommonSubsequence(p2);

      expect(lcs.getLength()).toBe(2);
      expect(lcs.getDirections()).toEqual(['↑', '↓']);
    });

    test('should find empty LCS for completely different patterns', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↓', '←']);
      const lcs = p1.longestCommonSubsequence(p2);

      expect(lcs.isEmpty()).toBe(true);
    });
  });

  describe('Pattern transformations', () => {
    test('should reverse pattern', () => {
      const pattern = new GesturePattern(['↑', '→', '↓']);
      const reversed = pattern.reverse();

      expect(reversed.getDirections()).toEqual(['↓', '→', '↑']);
    });

    test('should slice pattern', () => {
      const pattern = new GesturePattern(['↑', '→', '↓', '←']);
      const sliced = pattern.slice(1, 3);

      expect(sliced.getDirections()).toEqual(['→', '↓']);
    });
  });

  describe('Complexity calculation', () => {
    test('should calculate complexity for empty pattern', () => {
      const empty = new GesturePattern([]);
      expect(empty.getComplexity()).toBe(0);
    });

    test('should calculate complexity for simple pattern', () => {
      const simple = new GesturePattern(['↑']);
      expect(simple.getComplexity()).toBe(1);
    });

    test('should calculate complexity with direction changes', () => {
      const complex = new GesturePattern(['↑', '→', '↓']);
      expect(complex.getComplexity()).toBeGreaterThan(3);
    });

    test('should calculate complexity for repeated directions', () => {
      const repeated = new GesturePattern(['↑', '↑', '↑']);
      expect(repeated.getComplexity()).toBe(3); // no direction changes
    });
  });

  describe('Validation', () => {
    test('should validate valid patterns', () => {
      const valid = new GesturePattern(['↑', '→']);
      expect(valid.isValid()).toBe(true);
    });

    test('should validate empty pattern as invalid', () => {
      const empty = new GesturePattern([]);
      expect(empty.isValid()).toBe(false);
    });
  });

  describe('Serialization', () => {
    test('should convert to string', () => {
      const pattern = new GesturePattern(['↑', '→', '↓']);
      expect(pattern.toString()).toBe('↑→↓');
    });

    test('should convert to array', () => {
      const pattern = new GesturePattern(['↑', '→']);
      expect(pattern.toArray()).toEqual(['↑', '→']);
    });

    test('should convert to JSON', () => {
      const pattern = new GesturePattern(['↑', '→']);
      expect(pattern.toJSON()).toEqual(['↑', '→']);
    });

    test('should create from array', () => {
      const pattern = GesturePattern.fromArray(['↑', '→']);
      expect(pattern.getDirections()).toEqual(['↑', '→']);
    });

    test('should create from string', () => {
      const pattern = GesturePattern.fromString('↑→↓');
      expect(pattern.getDirections()).toEqual(['↑', '→', '↓']);
    });
  });

  describe('Static factory methods', () => {
    test('should create empty pattern', () => {
      const empty = GesturePattern.empty();
      expect(empty.isEmpty()).toBe(true);
    });

    test('should create single direction pattern', () => {
      const single = GesturePattern.single('↑');
      expect(single.getDirections()).toEqual(['↑']);
    });

    test('should convert angle to direction', () => {
      expect(GesturePattern.angleToDirection(0)).toBe('→');
      expect(GesturePattern.angleToDirection(Math.PI / 2)).toBe('↓');
      expect(GesturePattern.angleToDirection(Math.PI)).toBe('←');
      expect(GesturePattern.angleToDirection(-Math.PI / 2)).toBe('↑');
    });
  });

  describe('Threshold-based matching', () => {
    test('should match with threshold', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↑', '↓']);
      const threshold = new Threshold(15, 0.4, 0.5);

      expect(p1.matches(p2, threshold)).toBe(true);
    });

    test('should not match with strict threshold', () => {
      const p1 = new GesturePattern(['↑', '→']);
      const p2 = new GesturePattern(['↓', '←']);
      const threshold = new Threshold(15, 0.8, 0.5);

      expect(p1.matches(p2, threshold)).toBe(false);
    });
  });
});
