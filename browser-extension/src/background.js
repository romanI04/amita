// Background service worker for API calls and authentication
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api' 
  : 'https://amita.ai/api';

class AmitaBackground {
  constructor() {
    this.authToken = null;
    this.user = null;
    this.init();
  }

  async init() {
    // Load stored auth token
    const stored = await chrome.storage.local.get(['authToken', 'user']);
    if (stored.authToken) {
      this.authToken = stored.authToken;
      this.user = stored.user;
    }

    // Set up message listeners
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Set up context menu
    this.setupContextMenu();
    
    // Set up keyboard shortcuts
    this.setupCommands();
  }

  handleMessage(request, sender, sendResponse) {
    // Handle async responses
    (async () => {
      try {
        let response;
        
        switch (request.action) {
          case 'login':
            response = await this.handleLogin(request.data);
            break;
          case 'logout':
            response = await this.handleLogout();
            break;
          case 'analyze':
            response = await this.handleAnalyze(request.data);
            break;
          case 'applyFixes':
            response = await this.handleApplyFixes(request.data);
            break;
          case 'getStats':
            response = await this.getStats();
            break;
          default:
            response = { success: false, error: 'Unknown action' };
        }
        
        sendResponse(response);
      } catch (error) {
        console.error('Background script error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    // Return true to indicate async response
    return true;
  }

  async handleLogin({ email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.session) {
        this.authToken = data.session.access_token;
        this.user = data.user;
        
        // Store in chrome storage
        await chrome.storage.local.set({
          authToken: this.authToken,
          user: this.user,
        });
        
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error' };
    }
  }

  async handleLogout() {
    this.authToken = null;
    this.user = null;
    await chrome.storage.local.remove(['authToken', 'user']);
    return { success: true };
  }

  async handleAnalyze({ text, type }) {
    if (!this.authToken) {
      return { success: false, error: 'Please sign in first' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update stats
        await this.updateStats('analyze');
        
        // Store last analysis
        await chrome.storage.local.set({
          lastAnalysis: {
            timestamp: Date.now(),
            type,
            result: data,
          },
        });
        
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Analysis failed' };
      }
    } catch (error) {
      console.error('Analysis error:', error);
      return { success: false, error: 'Connection error' };
    }
  }

  async handleApplyFixes({ text, fixes }) {
    if (!this.authToken) {
      return { success: false, error: 'Please sign in first' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ text, suggestions: fixes }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update stats
        await this.updateStats('fix');
        
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Failed to apply fixes' };
      }
    } catch (error) {
      console.error('Apply fixes error:', error);
      return { success: false, error: 'Connection error' };
    }
  }

  async updateStats(action) {
    const stored = await chrome.storage.local.get(['stats']);
    const stats = stored.stats || {
      textsAnalyzed: 0,
      fixesApplied: 0,
      aiRiskReduced: 0,
      authenticityScore: 0,
    };

    if (action === 'analyze') {
      stats.textsAnalyzed++;
    } else if (action === 'fix') {
      stats.fixesApplied++;
    }

    await chrome.storage.local.set({ stats });
  }

  async getStats() {
    const stored = await chrome.storage.local.get(['stats']);
    return { success: true, data: stored.stats || {} };
  }

  setupContextMenu() {
    chrome.contextMenus.create({
      id: 'amita-analyze',
      title: 'Analyze with amita.ai',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'amita-fix',
      title: 'Fix with amita.ai',
      contexts: ['selection'],
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'amita-analyze') {
        chrome.tabs.sendMessage(tab.id, {
          action: 'analyzeSelection',
        });
      } else if (info.menuItemId === 'amita-fix') {
        chrome.tabs.sendMessage(tab.id, {
          action: 'quickFix',
        });
      }
    });
  }

  setupCommands() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'analyze-selection') {
        // Get active tab and send message
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'analyzeSelection',
            });
          }
        });
      } else if (command === 'quick-fix') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'quickFix',
            });
          }
        });
      }
    });
  }
}

// Initialize background script
const amitaBG = new AmitaBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page on first install
    chrome.tabs.create({
      url: 'https://amita.ai/welcome',
    });
  } else if (details.reason === 'update') {
    // Handle updates if needed
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});