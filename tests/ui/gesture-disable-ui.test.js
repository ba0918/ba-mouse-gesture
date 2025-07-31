// ジェスチャー無効化UI機能のテスト

/**
 * @jest-environment jsdom
 */

describe('ジェスチャー無効化UI機能', () => {
  let mockChrome;
  let mockOptionsManager;
  let mockElements;

  beforeEach(() => {
    // Chrome APIのモック
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
        },
      },
      runtime: {
        sendMessage: jest.fn(),
      },
    };
    global.chrome = mockChrome;

    // DOM要素のモック
    mockElements = {
      saveStatus: {
        textContent: '',
        className: '',
        style: { display: 'none' },
      },
      allGesturesList: {
        innerHTML: '',
        addEventListener: jest.fn(),
      },
    };

    document.getElementById = jest.fn((id) => mockElements[id]);
    document.querySelectorAll = jest.fn(() => []);

    // OptionsManagerのモック
    mockOptionsManager = {
      currentSettings: {
        enabled: true,
        strokeColor: '#2196F3',
        strokeWidth: 3,
        gestureThreshold: 15,
        excludeList: [],
        defaultGestureStates: {
          left: true,
          right: true,
          up: true,
          down: true,
          downright: true,
          upright: true,
          rightdown: true,
          updown: true,
          super_refresh: true,
          prev_tab: true,
          next_tab: true,
        },
      },
      allGestures: [],

      async saveSettings() {
        await chrome.storage.sync.set(this.currentSettings);
        this.showSaveStatus('設定を保存しました', true);
        chrome.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          settings: this.currentSettings,
        });
      },

      showSaveStatus(message, isSuccess) {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
          statusElement.textContent = message;
          statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`;
          statusElement.style.display = 'block';
        }
      },

      async toggleGestureStatus(gestureId) {
        const gesture = this.allGestures.find((g) => g.id === gestureId);
        if (!gesture) return;

        gesture.enabled = !gesture.enabled;

        if (gesture.type === 'default') {
          try {
            if (!this.currentSettings.defaultGestureStates) {
              this.currentSettings.defaultGestureStates = {};
            }
            this.currentSettings.defaultGestureStates[gestureId] = gesture.enabled;
            await this.saveSettings();
            this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true);
            this.filterAndRenderGestures();
          } catch (error) {
            console.error('Failed to save default gesture state:', error);
            this.showSaveStatus('ジェスチャー状態の保存に失敗しました', false);
            gesture.enabled = !gesture.enabled; // ロールバック
          }
        }
      },

      filterAndRenderGestures: jest.fn(),

      generateGestureItemHTML(gesture) {
        const toggleClass = gesture.enabled ? 'enabled' : 'disabled';
        const toggleText = gesture.enabled ? 'オン' : 'オフ';

        return `
          <div class="gesture-item ${gesture.type}" data-gesture-id="${gesture.id}">
            <div class="gesture-info">
              <span class="gesture-pattern">${gesture.pattern}</span>
              <span class="gesture-name">${gesture.name}</span>
              ${gesture.isNew ? '<span class="new-badge">New</span>' : ''}
            </div>
            <div class="gesture-controls">
              <button class="toggle-btn ${toggleClass}" data-action="toggle" data-gesture-id="${gesture.id}">
                ${toggleText}
              </button>
            </div>
          </div>
        `;
      },
    };

    // mockChrome設定
    mockChrome.storage.sync.set.mockResolvedValue();
  });

  describe('ジェスチャートグルボタンUI', () => {
    test('有効なジェスチャーに正しいボタン表示', () => {
      const gesture = {
        id: 'left',
        name: 'ブラウザの戻る',
        pattern: '←',
        type: 'default',
        enabled: true,
      };

      mockOptionsManager.allGestures = [gesture];

      const html = mockOptionsManager.generateGestureItemHTML(gesture);

      expect(html).toContain('toggle-btn enabled');
      expect(html).toContain('オン');
      expect(html).toContain('data-gesture-id="left"');
    });

    test('無効なジェスチャーに正しいボタン表示', () => {
      const gesture = {
        id: 'left',
        name: 'ブラウザの戻る',
        pattern: '←',
        type: 'default',
        enabled: false,
      };

      mockOptionsManager.allGestures = [gesture];

      const html = mockOptionsManager.generateGestureItemHTML(gesture);

      expect(html).toContain('toggle-btn disabled');
      expect(html).toContain('オフ');
      expect(html).toContain('data-gesture-id="left"');
    });

    test('Phase 10新機能にNEWバッジが表示される', () => {
      const gesture = {
        id: 'super_refresh',
        name: 'スーパーリロード',
        pattern: '↑↓↑',
        type: 'default',
        enabled: true,
        isNew: true,
      };

      const html = mockOptionsManager.generateGestureItemHTML(gesture);

      expect(html).toContain('<span class="new-badge">New</span>');
      expect(html).toContain('toggle-btn enabled');
    });
  });

  describe('ジェスチャー状態切り替え操作', () => {
    beforeEach(() => {
      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          type: 'default',
          enabled: true,
        },
        {
          id: 'super_refresh',
          name: 'スーパーリロード',
          pattern: '↑↓↑',
          type: 'default',
          enabled: true,
        },
      ];
    });

    test('有効→無効への切り替えが正常動作', async () => {
      const gestureId = 'left';
      const gesture = mockOptionsManager.allGestures.find((g) => g.id === gestureId);
      expect(gesture.enabled).toBe(true);

      await mockOptionsManager.toggleGestureStatus(gestureId);

      // 状態が変更されることを確認
      expect(gesture.enabled).toBe(false);

      // 設定に保存されることを確認
      expect(mockOptionsManager.currentSettings.defaultGestureStates.left).toBe(false);

      // Chrome storageに保存されることを確認
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultGestureStates: expect.objectContaining({
            left: false,
          }),
        })
      );

      // 成功メッセージが表示されることを確認
      expect(mockElements.saveStatus.textContent).toBe('ブラウザの戻るを無効にしました');
      expect(mockElements.saveStatus.className).toContain('success');
    });

    test('無効→有効への切り替えが正常動作', async () => {
      const gestureId = 'super_refresh';
      const gesture = mockOptionsManager.allGestures.find((g) => g.id === gestureId);
      gesture.enabled = false; // 初期状態を無効に設定

      await mockOptionsManager.toggleGestureStatus(gestureId);

      // 状態が変更されることを確認
      expect(gesture.enabled).toBe(true);

      // 設定に保存されることを確認
      expect(mockOptionsManager.currentSettings.defaultGestureStates.super_refresh).toBe(true);

      // 成功メッセージが表示されることを確認
      expect(mockElements.saveStatus.textContent).toBe('スーパーリロードを有効にしました');
      expect(mockElements.saveStatus.className).toContain('success');
    });

    test('複数のジェスチャーを個別に切り替えできる', async () => {
      // leftを無効化
      await mockOptionsManager.toggleGestureStatus('left');
      expect(mockOptionsManager.allGestures.find((g) => g.id === 'left').enabled).toBe(false);
      expect(mockOptionsManager.currentSettings.defaultGestureStates.left).toBe(false);

      // super_refreshはそのまま有効
      expect(mockOptionsManager.allGestures.find((g) => g.id === 'super_refresh').enabled).toBe(true);

      // super_refreshを無効化
      await mockOptionsManager.toggleGestureStatus('super_refresh');
      expect(mockOptionsManager.allGestures.find((g) => g.id === 'super_refresh').enabled).toBe(false);
      expect(mockOptionsManager.currentSettings.defaultGestureStates.super_refresh).toBe(false);

      // leftは無効のまま
      expect(mockOptionsManager.allGestures.find((g) => g.id === 'left').enabled).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    test('保存エラー時にロールバック処理が実行される', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('保存エラー'));

      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          type: 'default',
          enabled: true,
        },
      ];

      const originalState = mockOptionsManager.allGestures[0].enabled;

      await mockOptionsManager.toggleGestureStatus('left');

      // エラー時にロールバックされることを確認
      expect(mockOptionsManager.allGestures[0].enabled).toBe(originalState);

      // エラーメッセージが表示されることを確認
      expect(mockElements.saveStatus.textContent).toBe('ジェスチャー状態の保存に失敗しました');
      expect(mockElements.saveStatus.className).toContain('error');
    });

    test('存在しないジェスチャーIDでも処理が完了する', async () => {
      await mockOptionsManager.toggleGestureStatus('non_existent_gesture');

      // エラーが発生しないことを確認
      expect(mockChrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe('UI表示更新', () => {
    test('ジェスチャー状態変更後にUI更新が実行される', async () => {
      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          type: 'default',
          enabled: true,
        },
      ];

      await mockOptionsManager.toggleGestureStatus('left');

      // UI更新メソッドが呼ばれることを確認
      expect(mockOptionsManager.filterAndRenderGestures).toHaveBeenCalled();
    });

    test('設定保存後にChrome runtime通知が送信される', async () => {
      await mockOptionsManager.saveSettings();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SETTINGS_UPDATED',
        settings: mockOptionsManager.currentSettings,
      });
    });
  });

  describe('defaultGestureStates初期化', () => {
    test('defaultGestureStatesが存在しない場合に自動作成される', async () => {
      // defaultGestureStatesを削除
      delete mockOptionsManager.currentSettings.defaultGestureStates;

      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          type: 'default',
          enabled: true,
        },
      ];

      await mockOptionsManager.toggleGestureStatus('left');

      // 自動的に作成されることを確認
      expect(mockOptionsManager.currentSettings.defaultGestureStates).toBeDefined();
      expect(mockOptionsManager.currentSettings.defaultGestureStates.left).toBe(false);
    });
  });

  describe('全ジェスチャー一覧表示', () => {
    test('すべてのデフォルトジェスチャーが正しい状態で表示される', () => {
      const allDefaultGestures = [
        { id: 'left', name: 'ブラウザの戻る', pattern: '←', type: 'default', enabled: true },
        { id: 'right', name: 'ブラウザの進む', pattern: '→', type: 'default', enabled: false },
        { id: 'super_refresh', name: 'スーパーリロード', pattern: '↑↓↑', type: 'default', enabled: true, isNew: true },
        { id: 'prev_tab', name: '前のタブ', pattern: '←→', type: 'default', enabled: false, isNew: true },
        { id: 'next_tab', name: '次のタブ', pattern: '→←', type: 'default', enabled: true, isNew: true },
      ];

      mockOptionsManager.allGestures = allDefaultGestures;

      const htmlParts = allDefaultGestures.map((gesture) => mockOptionsManager.generateGestureItemHTML(gesture));

      // 有効なジェスチャー
      expect(htmlParts[0]).toContain('toggle-btn enabled');
      expect(htmlParts[2]).toContain('toggle-btn enabled'); // super_refresh
      expect(htmlParts[4]).toContain('toggle-btn enabled'); // next_tab

      // 無効なジェスチャー
      expect(htmlParts[1]).toContain('toggle-btn disabled');
      expect(htmlParts[3]).toContain('toggle-btn disabled'); // prev_tab

      // NEWバッジ
      expect(htmlParts[2]).toContain('new-badge'); // super_refresh
      expect(htmlParts[3]).toContain('new-badge'); // prev_tab
      expect(htmlParts[4]).toContain('new-badge'); // next_tab
    });
  });

  describe('イベントハンドリング', () => {
    test('トグルボタンクリックイベントが正しく処理される', () => {
      const mockEvent = {
        target: {
          dataset: {
            action: 'toggle',
            gestureId: 'left',
          },
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      // イベントハンドラーのシミュレート
      const handleGestureAction = async function (event) {
        event.preventDefault();
        event.stopPropagation();

        const action = event.target.dataset.action;
        const gestureId = event.target.dataset.gestureId;

        if (action === 'toggle' && gestureId) {
          await this.toggleGestureStatus(gestureId);
        }
      }.bind(mockOptionsManager);

      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          type: 'default',
          enabled: true,
        },
      ];

      // イベント処理実行
      handleGestureAction(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});
