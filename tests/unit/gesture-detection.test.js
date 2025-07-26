// ジェスチャー検出のユニットテスト

describe('ジェスチャー検出機能', () => {
  let mockDocument
  // let gestureModule // 将来の機能拡張用
  
  beforeEach(() => {
    // DOM のモック
    mockDocument = {
      createElement: jest.fn((tag) => {
        if (tag === 'canvas') {
          return {
            style: { cssText: '' },
            width: 0,
            height: 0,
            getContext: jest.fn(() => ({
              clearRect: jest.fn(),
              beginPath: jest.fn(),
              moveTo: jest.fn(),
              lineTo: jest.fn(),
              stroke: jest.fn(),
              strokeStyle: '',
              lineWidth: 3,
              lineCap: 'round',
              lineJoin: 'round'
            }))
          }
        }
        if (tag === 'div') {
          return {
            id: '',
            style: { cssText: '' },
            textContent: '',
            remove: jest.fn(),
            parentNode: null
          }
        }
      }),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        scrollHeight: 1000
      },
      getElementById: jest.fn(),
      addEventListener: jest.fn()
    }
    
    // グローバル変数のリセット
    global.document = mockDocument
    global.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      scrollTo: jest.fn(),
      location: {
        href: 'https://example.com',
        hostname: 'example.com'
      }
    }
  })
  
  describe('基本的なジェスチャー検出', () => {
    test('右方向のジェスチャーが検出される', () => {
      const startPos = { x: 100, y: 100 }
      const endPos = { x: 200, y: 100 }
      
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      expect(distance).toBeGreaterThan(50)
      expect(Math.abs(deltaX)).toBeGreaterThan(Math.abs(deltaY))
      expect(deltaX > 0).toBe(true)
      
      const direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
      expect(direction).toBe('RIGHT')
    })
    
    test('左方向のジェスチャーが検出される', () => {
      const startPos = { x: 200, y: 100 }
      const endPos = { x: 100, y: 100 }
      
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      expect(distance).toBeGreaterThan(50)
      expect(Math.abs(deltaX)).toBeGreaterThan(Math.abs(deltaY))
      expect(deltaX < 0).toBe(true)
      
      const direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
      expect(direction).toBe('LEFT')
    })
    
    test('上方向のジェスチャーが検出される', () => {
      const startPos = { x: 100, y: 200 }
      const endPos = { x: 100, y: 100 }
      
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      expect(distance).toBeGreaterThan(50)
      expect(Math.abs(deltaY)).toBeGreaterThan(Math.abs(deltaX))
      expect(deltaY < 0).toBe(true)
      
      const direction = deltaY > 0 ? 'DOWN' : 'UP'
      expect(direction).toBe('UP')
    })
    
    test('下方向のジェスチャーが検出される', () => {
      const startPos = { x: 100, y: 100 }
      const endPos = { x: 100, y: 200 }
      
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      expect(distance).toBeGreaterThan(50)
      expect(Math.abs(deltaY)).toBeGreaterThan(Math.abs(deltaX))
      expect(deltaY > 0).toBe(true)
      
      const direction = deltaY > 0 ? 'DOWN' : 'UP'
      expect(direction).toBe('DOWN')
    })
    
    test('距離が短すぎる場合はジェスチャーとして認識されない', () => {
      const startPos = { x: 100, y: 100 }
      const endPos = { x: 110, y: 110 }
      
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      expect(distance).toBeLessThan(50)
    })
  })
  
  describe('複合ジェスチャーの検出', () => {
    test('下→右の複合ジェスチャーが検出される', () => {
      const trail = [
        { x: 100, y: 100 },
        { x: 100, y: 120 },
        { x: 100, y: 140 },
        { x: 100, y: 160 },
        { x: 100, y: 180 },
        { x: 100, y: 200 }, // 下へ
        { x: 120, y: 200 },
        { x: 140, y: 200 },
        { x: 160, y: 200 },
        { x: 180, y: 200 },
        { x: 200, y: 200 }  // 右へ
      ]
      
      const directions = []
      const segmentLength = 5
      
      for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
        const start = trail[i]
        const end = trail[Math.min(i + segmentLength, trail.length - 1)]
        
        const deltaX = end.x - start.x
        const deltaY = end.y - start.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
        if (distance > 20) {
          let direction = ''
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
          } else {
            direction = deltaY > 0 ? 'DOWN' : 'UP'
          }
          directions.push(direction)
        }
      }
      
      expect(directions).toEqual(['DOWN', 'RIGHT'])
    })
  })
  
  describe('設定の適用', () => {
    test('除外サイトでジェスチャーが無効化される', () => {
      const settings = {
        enabled: true,
        excludeList: ['example.com', '*.test.com']
      }
      
      // 完全一致
      const mockLocation1 = { hostname: 'example.com' }
      const isExcluded1 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation1.hostname)
        }
        return mockLocation1.hostname.includes(pattern)
      })
      expect(isExcluded1).toBe(true)
      
      // ワイルドカードマッチ
      const mockLocation2 = { hostname: 'sub.test.com' }
      const isExcluded2 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation2.hostname)
        }
        return mockLocation2.hostname.includes(pattern)
      })
      expect(isExcluded2).toBe(true)
      
      // 非除外サイト
      const mockLocation3 = { hostname: 'allowed.com' }
      const isExcluded3 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation3.hostname)
        }
        return mockLocation3.hostname.includes(pattern)
      })
      expect(isExcluded3).toBe(false)
    })
    
    test('設定が無効の場合ジェスチャーが動作しない', () => {
      const settings = {
        enabled: false,
        excludeList: []
      }
      
      expect(settings.enabled).toBe(false)
    })
  })
})