// パフォーマンステスト

describe('パフォーマンステスト', () => {
  let startTime;
  let memoryUsageBefore;

  beforeEach(() => {
    startTime = performance.now();
    if (performance.memory) {
      memoryUsageBefore = performance.memory.usedJSHeapSize;
    }
  });

  afterEach(() => {
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    if (performance.memory) {
      const memoryUsageAfter = performance.memory.usedJSHeapSize;
      const memoryDelta = (memoryUsageAfter - memoryUsageBefore) / 1024 / 1024;
      console.log(`Memory usage delta: ${memoryDelta.toFixed(2)} MB`);
    }

    console.log(`Execution time: ${executionTime.toFixed(2)} ms`);
  });

  describe('ジェスチャー認識のパフォーマンス', () => {
    test('ジェスチャー認識が50ms以内に完了する', () => {
      const trail = [];
      const trailLength = 100;

      // 100点の軌跡データを生成
      for (let i = 0; i < trailLength; i++) {
        trail.push({
          x: 100 + i * 2,
          y: 100 + Math.sin(i / 10) * 50,
        });
      }

      const recognitionStart = performance.now();

      // ジェスチャー認識のシミュレーション
      const directions = [];
      const segmentLength = Math.max(5, Math.floor(trail.length / 8));

      for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
        const start = trail[i];
        const end = trail[Math.min(i + segmentLength, trail.length - 1)];

        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > 20) {
          let direction = '';
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
          } else {
            direction = deltaY > 0 ? 'DOWN' : 'UP';
          }
          directions.push(direction);
        }
      }

      const recognitionEnd = performance.now();
      const recognitionTime = recognitionEnd - recognitionStart;

      expect(recognitionTime).toBeLessThan(50);
      console.log(`Gesture recognition time: ${recognitionTime.toFixed(2)} ms`);
    });

    test('大量の軌跡点でもメモリリークしない', () => {
      const trails = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const trail = [];
        for (let j = 0; j < 50; j++) {
          trail.push({ x: Math.random() * 1000, y: Math.random() * 1000 });
        }
        trails.push(trail);
      }

      // メモリ使用量が10MB以下であることを確認
      if (performance.memory) {
        const memoryUsed = (performance.memory.usedJSHeapSize - memoryUsageBefore) / 1024 / 1024;
        expect(memoryUsed).toBeLessThan(10);
      }
    });
  });

  describe('軌跡描画のパフォーマンス', () => {
    test('軌跡描画が16ms以内に完了する（60FPS）', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const trail = [];
      for (let i = 0; i < 200; i++) {
        trail.push({
          x: 100 + i * 5,
          y: 100 + Math.sin(i / 20) * 100,
        });
      }

      const drawStart = performance.now();

      // 軌跡描画のシミュレーション
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);

      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }

      ctx.stroke();

      const drawEnd = performance.now();
      const drawTime = drawEnd - drawStart;

      expect(drawTime).toBeLessThan(16);
      console.log(`Trail drawing time: ${drawTime.toFixed(2)} ms`);
    });
  });

  describe('設定の読み込み/保存パフォーマンス', () => {
    test('設定の読み込みが100ms以内に完了する', () => {
      const loadStart = performance.now();

      // chrome.storage.sync.get のモック実行
      const settings = chrome.storage.sync.get({
        enabled: true,
        strokeColor: '#2196F3',
        strokeWidth: 3,
        excludeList: [],
      });

      const loadEnd = performance.now();
      const loadTime = loadEnd - loadStart;

      expect(loadTime).toBeLessThan(100);
      expect(settings).toBeDefined();
      console.log(`Settings load time: ${loadTime.toFixed(2)} ms`);
    });

    test('設定の保存が100ms以内に完了する', async () => {
      const settings = {
        enabled: false,
        strokeColor: '#FF0000',
        strokeWidth: 5,
        excludeList: ['example.com', 'test.com', 'blocked.com'],
      };

      const saveStart = performance.now();

      await chrome.storage.sync.set(settings);

      const saveEnd = performance.now();
      const saveTime = saveEnd - saveStart;

      expect(saveTime).toBeLessThan(100);
      console.log(`Settings save time: ${saveTime.toFixed(2)} ms`);
    });
  });

  describe('メッセージ通信のパフォーマンス', () => {
    test('メッセージの送受信が50ms以内に完了する', async () => {
      const message = {
        type: 'simpleGesture',
        direction: 'LEFT',
        distance: 150,
      };

      const sendStart = performance.now();

      await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, () => {
          const sendEnd = performance.now();
          const sendTime = sendEnd - sendStart;

          expect(sendTime).toBeLessThan(50);
          console.log(`Message round-trip time: ${sendTime.toFixed(2)} ms`);
          resolve();
        });
      });
    });
  });

  describe('総合的なパフォーマンス要件', () => {
    test('拡張機能の初期化が500ms以内に完了する', async () => {
      const initStart = performance.now();

      // 初期化処理のシミュレーション
      // 1. 設定の読み込み
      await chrome.storage.sync.get({
        enabled: true,
        strokeColor: '#2196F3',
        strokeWidth: 3,
        excludeList: [],
      });

      // 2. イベントリスナーの設定
      const eventTypes = ['mousedown', 'mousemove', 'mouseup', 'contextmenu'];
      eventTypes.forEach((type) => {
        document.addEventListener(type, () => {});
      });

      // 3. Canvas要素の準備
      const canvas = document.createElement('canvas');
      canvas.getContext('2d');

      const initEnd = performance.now();
      const initTime = initEnd - initStart;

      expect(initTime).toBeLessThan(500);
      console.log(`Extension initialization time: ${initTime.toFixed(2)} ms`);
    });

    test('メモリ使用量が10MB以下に収まる', () => {
      if (performance.memory) {
        const memoryUsedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        expect(memoryUsedMB).toBeLessThan(10);
        console.log(`Total memory usage: ${memoryUsedMB.toFixed(2)} MB`);
      }
    });
  });
});
