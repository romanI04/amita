// Popup UI for the browser extension
import { getAuthToken, isAuthenticated, logout } from './auth.js';
import { analyzeText, applyQuickFixes } from './api.js';

class PopupUI {
  constructor() {
    this.root = document.getElementById('root');
    this.isLoggedIn = false;
    this.stats = {
      textsAnalyzed: 0,
      aiRiskReduced: 0,
      authenticityScore: 0
    };
    this.init();
  }

  async init() {
    // Check authentication status
    this.isLoggedIn = await isAuthenticated();
    
    // Load stats from storage
    const stored = await chrome.storage.local.get(['stats', 'lastAnalysis']);
    if (stored.stats) {
      this.stats = stored.stats;
    }
    
    this.render();
    this.attachEventListeners();
  }

  render() {
    if (!this.isLoggedIn) {
      this.renderLoginView();
    } else {
      this.renderDashboardView();
    }
  }

  renderLoginView() {
    this.root.innerHTML = `
      <div class="popup-container">
        <div class="header">
          <div class="logo">
            <span class="logo-text">amita.ai</span>
          </div>
        </div>
        
        <div class="login-content">
          <h2>Welcome to amita.ai</h2>
          <p>Sign in to start analyzing your writing</p>
          
          <div class="login-form">
            <input type="email" id="email" placeholder="Email" class="input" />
            <input type="password" id="password" placeholder="Password" class="input" />
            <button id="login-btn" class="btn btn-primary">Sign In</button>
          </div>
          
          <div class="divider">or</div>
          
          <a href="https://amita.ai/signup" target="_blank" class="btn btn-secondary">
            Create Account
          </a>
        </div>
      </div>
    `;
  }

  renderDashboardView() {
    const lastAnalysis = this.getLastAnalysisTime();
    
    this.root.innerHTML = `
      <div class="popup-container">
        <div class="header">
          <div class="logo">
            <span class="logo-text">amita.ai</span>
          </div>
          <button id="settings-btn" class="icon-btn">⚙️</button>
        </div>
        
        <div class="dashboard-content">
          <div class="user-info">
            <div class="avatar">👤</div>
            <div class="greeting">Ready to write authentically!</div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${this.stats.textsAnalyzed}</div>
              <div class="stat-label">Texts Analyzed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.authenticityScore}%</div>
              <div class="stat-label">Avg Authenticity</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">-${this.stats.aiRiskReduced}%</div>
              <div class="stat-label">AI Risk Reduced</div>
            </div>
          </div>
          
          <div class="quick-actions">
            <button id="analyze-page-btn" class="btn btn-primary">
              <span class="icon">🔍</span>
              Analyze Current Page
            </button>
            
            <button id="analyze-selection-btn" class="btn btn-secondary">
              <span class="icon">✏️</span>
              Analyze Selection
            </button>
          </div>
          
          <div class="shortcuts">
            <div class="shortcut-item">
              <kbd>⌘ Shift A</kbd>
              <span>Analyze selected text</span>
            </div>
            <div class="shortcut-item">
              <kbd>⌘ Shift F</kbd>
              <span>Apply quick fixes</span>
            </div>
          </div>
          
          ${lastAnalysis ? `
            <div class="last-analysis">
              Last analysis: ${lastAnalysis}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <a href="https://amita.ai/dashboard" target="_blank" class="link">Dashboard</a>
          <span class="separator">•</span>
          <button id="logout-btn" class="link">Sign Out</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Login form
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', this.handleLogin.bind(this));
    }

    // Dashboard actions
    const analyzePageBtn = document.getElementById('analyze-page-btn');
    if (analyzePageBtn) {
      analyzePageBtn.addEventListener('click', this.handleAnalyzePage.bind(this));
    }

    const analyzeSelectionBtn = document.getElementById('analyze-selection-btn');
    if (analyzeSelectionBtn) {
      analyzeSelectionBtn.addEventListener('click', this.handleAnalyzeSelection.bind(this));
    }

    // Settings and logout
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', this.handleOpenSettings.bind(this));
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      this.showToast('Please enter email and password', 'error');
      return;
    }

    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      // Send login request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'login',
        data: { email, password }
      });

      if (response.success) {
        this.isLoggedIn = true;
        this.showToast('Signed in successfully!', 'success');
        this.render();
      } else {
        this.showToast(response.error || 'Login failed', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    } catch (error) {
      this.showToast('Connection error', 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  }

  async handleAnalyzePage() {
    // Send message to content script to analyze entire page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzePage'
    });
    
    window.close();
  }

  async handleAnalyzeSelection() {
    // Send message to content script to analyze selected text
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzeSelection'
    });
    
    window.close();
  }

  handleOpenSettings() {
    chrome.runtime.openOptionsPage();
  }

  async handleLogout() {
    await logout();
    this.isLoggedIn = false;
    this.render();
  }

  getLastAnalysisTime() {
    const lastAnalysis = localStorage.getItem('lastAnalysisTime');
    if (!lastAnalysis) return null;
    
    const date = new Date(lastAnalysis);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
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

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});