// Options page script
import { getAuthToken, isAuthenticated } from './auth.js';

class OptionsPage {
  constructor() {
    this.container = document.getElementById('settings-content');
    this.settings = {
      enableRealTime: true,
      showFieldIndicators: true,
      autoAnalyze: false,
      minTextLength: 50,
      theme: 'light',
      notifications: true,
      shortcuts: {
        analyze: 'Cmd+Shift+A',
        quickFix: 'Cmd+Shift+F'
      }
    };
    this.init();
  }

  async init() {
    // Load saved settings
    const stored = await chrome.storage.sync.get(['settings']);
    if (stored.settings) {
      this.settings = { ...this.settings, ...stored.settings };
    }

    // Check auth status
    const isLoggedIn = await isAuthenticated();
    
    this.render(isLoggedIn);
    this.attachEventListeners();
  }

  render(isLoggedIn) {
    this.container.innerHTML = `
      ${!isLoggedIn ? `
        <div class="auth-warning">
          <div class="warning-icon">⚠️</div>
          <h3>Not Signed In</h3>
          <p>Please sign in through the extension popup to access all features.</p>
          <button id="open-popup-btn" class="btn btn-primary">Open Extension</button>
        </div>
      ` : ''}
      
      <div class="settings-section">
        <h2>General Settings</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="enable-realtime">Real-time Analysis</label>
            <p class="setting-description">Analyze text as you type in text fields</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="enable-realtime" ${this.settings.enableRealTime ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="show-indicators">Field Indicators</label>
            <p class="setting-description">Show amita.ai badges on text fields</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="show-indicators" ${this.settings.showFieldIndicators ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="auto-analyze">Auto-analyze</label>
            <p class="setting-description">Automatically analyze when text reaches minimum length</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="auto-analyze" ${this.settings.autoAnalyze ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="min-length">Minimum Text Length</label>
            <p class="setting-description">Minimum characters required for analysis</p>
          </div>
          <input type="number" id="min-length" value="${this.settings.minTextLength}" min="20" max="500" class="number-input">
        </div>
      </div>
      
      <div class="settings-section">
        <h2>Appearance</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>Theme</label>
            <p class="setting-description">Choose your preferred color theme</p>
          </div>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="theme" value="light" ${this.settings.theme === 'light' ? 'checked' : ''}>
              <span>Light</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="theme" value="dark" ${this.settings.theme === 'dark' ? 'checked' : ''}>
              <span>Dark</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="theme" value="auto" ${this.settings.theme === 'auto' ? 'checked' : ''}>
              <span>Auto</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h2>Notifications</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label for="notifications">Desktop Notifications</label>
            <p class="setting-description">Show notifications for analysis results</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="notifications" ${this.settings.notifications ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h2>Keyboard Shortcuts</h2>
        <p class="section-description">Configure keyboard shortcuts for quick actions</p>
        
        <div class="shortcuts-list">
          <div class="shortcut-item">
            <span class="shortcut-action">Analyze Selection</span>
            <kbd>${this.settings.shortcuts.analyze}</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">Apply Quick Fix</span>
            <kbd>${this.settings.shortcuts.quickFix}</kbd>
          </div>
        </div>
        
        <button id="configure-shortcuts-btn" class="btn btn-secondary">
          Configure in Chrome Settings
        </button>
      </div>
      
      <div class="settings-section">
        <h2>Data & Privacy</h2>
        
        <div class="data-actions">
          <button id="clear-cache-btn" class="btn btn-secondary">
            Clear Analysis Cache
          </button>
          <button id="export-data-btn" class="btn btn-secondary">
            Export Your Data
          </button>
        </div>
      </div>
      
      <div class="save-section">
        <button id="save-btn" class="btn btn-primary">Save Settings</button>
        <button id="reset-btn" class="btn btn-secondary">Reset to Defaults</button>
      </div>
    `;
  }

  attachEventListeners() {
    // Save settings
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', this.saveSettings.bind(this));
    }

    // Reset settings
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.resetSettings.bind(this));
    }

    // Open popup
    const openPopupBtn = document.getElementById('open-popup-btn');
    if (openPopupBtn) {
      openPopupBtn.addEventListener('click', () => {
        chrome.action.openPopup();
      });
    }

    // Configure shortcuts
    const shortcutsBtn = document.getElementById('configure-shortcuts-btn');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      });
    }

    // Clear cache
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', this.clearCache.bind(this));
    }

    // Export data
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', this.exportData.bind(this));
    }

    // Track changes
    this.trackChanges();
  }

  trackChanges() {
    // Checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.id.replace(/-/g, '');
        this.settings[key] = e.target.checked;
      });
    });

    // Radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.name === 'theme') {
          this.settings.theme = e.target.value;
        }
      });
    });

    // Number input
    const minLength = document.getElementById('min-length');
    if (minLength) {
      minLength.addEventListener('change', (e) => {
        this.settings.minTextLength = parseInt(e.target.value);
      });
    }
  }

  async saveSettings() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      await chrome.storage.sync.set({ settings: this.settings });
      
      // Notify content scripts
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: this.settings
        }).catch(() => {}); // Ignore errors for inactive tabs
      });

      this.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      this.showToast('Failed to save settings', 'error');
    } finally {
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settings = {
        enableRealTime: true,
        showFieldIndicators: true,
        autoAnalyze: false,
        minTextLength: 50,
        theme: 'light',
        notifications: true,
        shortcuts: {
          analyze: 'Cmd+Shift+A',
          quickFix: 'Cmd+Shift+F'
        }
      };
      
      await chrome.storage.sync.set({ settings: this.settings });
      this.render(await isAuthenticated());
      this.attachEventListeners();
      this.showToast('Settings reset to defaults', 'success');
    }
  }

  async clearCache() {
    await chrome.storage.local.remove(['analysisHistory', 'lastAnalysis', 'stats']);
    this.showToast('Cache cleared successfully', 'success');
  }

  async exportData() {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amita-extension-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Data exported successfully', 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});