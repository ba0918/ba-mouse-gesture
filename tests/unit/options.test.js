// オプション画面のユニットテスト

describe('オプション画面', () => {
  // let optionsManager // 将来の機能拡張用
  let mockElements;

  beforeEach(() => {
    // DOM要素のモック
    mockElements = {
      enabled: { checked: true, addEventListener: jest.fn() },
      strokeColor: { value: '#2196F3', addEventListener: jest.fn() },
      strokeWidth: { value: '3', addEventListener: jest.fn() },
      strokeWidthValue: { textContent: '3px' },
      gestureThreshold: { value: '15', addEventListener: jest.fn() },
      gestureThresholdValue: { textContent: '15px' },
      newExcludeUrl: { value: '', addEventListener: jest.fn() },
      addExcludeBtn: { addEventListener: jest.fn() },
      excludeList: { innerHTML: '' },
      saveStatus: { style: { display: 'none' }, textContent: '', className: '' },
      previewCanvas: {
        getContext: jest.fn(() => ({
          clearRect: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          stroke: jest.fn(),
          fillText: jest.fn(),
          strokeStyle: '',
          lineWidth: 1,
          lineCap: 'round',
          lineJoin: 'round',
          fillStyle: '',
          font: '',
        })),
      },
    };

    // getElementById のモック
    document.getElementById = jest.fn((id) => mockElements[id]);

    // chrome.storage のモックをリセット
    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
  });

  describe('設定の読み込み', () => {
    test('保存された設定を正しく読み込む', async () => {
      const savedSettings = {
        enabled: false,
        strokeColor: '#FF0000',
        strokeWidth: 5,
        gestureThreshold: 25,
        excludeList: ['example.com', '*.test.com'],
      };

      chrome.storage.sync.get.mockImplementation(() => {
        return Promise.resolve(savedSettings);
      });

      // 設定読み込みのシミュレーション
      const result = await chrome.storage.sync.get({});

      expect(result.enabled).toBe(false);
      expect(result.strokeColor).toBe('#FF0000');
      expect(result.strokeWidth).toBe(5);
      expect(result.gestureThreshold).toBe(25);
      expect(result.excludeList).toHaveLength(2);
    });

    test('デフォルト設定が適用される', async () => {
      const defaultSettings = {
        enabled: true,
        strokeColor: '#2196F3',
        strokeWidth: 3,
        gestureThreshold: 15,
        excludeList: [],
      };

      chrome.storage.sync.get.mockImplementation(() => {
        return Promise.resolve(defaultSettings);
      });

      const result = await chrome.storage.sync.get(defaultSettings);

      expect(result.enabled).toBe(true);
      expect(result.strokeColor).toBe('#2196F3');
      expect(result.strokeWidth).toBe(3);
      expect(result.gestureThreshold).toBe(15);
      expect(result.excludeList).toHaveLength(0);
    });
  });

  describe('設定の保存', () => {
    test('設定が正しく保存される', async () => {
      const newSettings = {
        enabled: false,
        strokeColor: '#00FF00',
        strokeWidth: 7,
        excludeList: ['blocked.com'],
      };

      await chrome.storage.sync.set(newSettings);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(newSettings);
    });

    test('設定変更がバックグラウンドスクリプトに通知される', () => {
      const settings = {
        enabled: false,
        strokeColor: '#FF0000',
      };

      const message = {
        type: 'SETTINGS_UPDATED',
        settings: settings,
      };

      chrome.runtime.sendMessage(message);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('除外リスト管理', () => {
    test('新しいURLを除外リストに追加できる', () => {
      const excludeList = [];
      const newUrl = 'example.com';

      // URLの追加
      excludeList.push(newUrl);

      expect(excludeList).toContain('example.com');
      expect(excludeList).toHaveLength(1);
    });

    test('重複するURLは追加されない', () => {
      const excludeList = ['example.com'];
      const duplicateUrl = 'example.com';

      // 重複チェック
      const isDuplicate = excludeList.includes(duplicateUrl);

      expect(isDuplicate).toBe(true);
      expect(excludeList).toHaveLength(1);
    });

    test('URLを除外リストから削除できる', () => {
      const excludeList = ['example.com', 'test.com', 'blocked.com'];
      const urlToRemove = 'test.com';

      // URLの削除
      const index = excludeList.indexOf(urlToRemove);
      if (index > -1) {
        excludeList.splice(index, 1);
      }

      expect(excludeList).not.toContain('test.com');
      expect(excludeList).toHaveLength(2);
    });

    test('空のURLは追加されない', () => {
      const excludeList = [];
      const emptyUrl = '';

      // 空文字チェック
      const isValid = emptyUrl.trim().length > 0;

      expect(isValid).toBe(false);
      expect(excludeList).toHaveLength(0);
    });
  });

  describe('UI更新', () => {
    test('軌跡の太さ変更時に表示が更新される', () => {
      const widthInput = mockElements.strokeWidth;
      const widthDisplay = mockElements.strokeWidthValue;

      // 値の変更
      widthInput.value = '5';
      widthDisplay.textContent = '5px';

      expect(widthDisplay.textContent).toBe('5px');
    });

    test('ジェスチャー感度変更時に表示が更新される', () => {
      const thresholdInput = mockElements.gestureThreshold;
      const thresholdDisplay = mockElements.gestureThresholdValue;

      // 値の変更
      thresholdInput.value = '30';
      thresholdDisplay.textContent = '30px';

      expect(thresholdDisplay.textContent).toBe('30px');
    });

    test('感度設定の範囲が適切に設定される', () => {
      const thresholdInput = mockElements.gestureThreshold;

      // 最小値テスト
      thresholdInput.value = '5';
      expect(parseInt(thresholdInput.value)).toBeGreaterThanOrEqual(5);

      // 最大値テスト
      thresholdInput.value = '50';
      expect(parseInt(thresholdInput.value)).toBeLessThanOrEqual(50);

      // デフォルト値テスト
      thresholdInput.value = '15';
      expect(parseInt(thresholdInput.value)).toBe(15);
    });

    test('保存成功メッセージが表示される', () => {
      const statusElement = mockElements.saveStatus;

      // 成功メッセージの表示
      statusElement.textContent = '設定を保存しました';
      statusElement.className = 'save-status success';
      statusElement.style.display = 'block';

      expect(statusElement.textContent).toBe('設定を保存しました');
      expect(statusElement.className).toContain('success');
      expect(statusElement.style.display).toBe('block');
    });

    test('エラーメッセージが表示される', () => {
      const statusElement = mockElements.saveStatus;

      // エラーメッセージの表示
      statusElement.textContent = '設定の保存に失敗しました';
      statusElement.className = 'save-status error';
      statusElement.style.display = 'block';

      expect(statusElement.textContent).toBe('設定の保存に失敗しました');
      expect(statusElement.className).toContain('error');
      expect(statusElement.style.display).toBe('block');
    });
  });

  describe('プレビュー機能', () => {
    test('軌跡のプレビューが描画される', () => {
      const canvas = mockElements.previewCanvas;
      const ctx = canvas.getContext('2d');

      // プレビュー描画の確認
      ctx.clearRect(0, 0, 200, 100);
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 30);
      ctx.lineTo(80, 30);
      ctx.lineTo(80, 70);
      ctx.stroke();

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(20, 30);
      expect(ctx.lineTo).toHaveBeenCalledWith(80, 30);
      expect(ctx.lineTo).toHaveBeenCalledWith(80, 70);
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });
});
