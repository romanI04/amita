// Content script - runs on every webpage
class AmitaContentScript {
  constructor() {
    this.isAnalyzing = false;
    this.overlay = null;
    this.selectedElement = null;
    this.init();
  }

  init() {
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Add context menu for right-click
    this.setupContextMenu();
    
    // Monitor text fields for real-time analysis
    this.monitorTextFields();
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'analyzePage':
        this.analyzePageContent();
        break;
      case 'analyzeSelection':
        this.analyzeSelectedText();
        break;
      case 'applyFixes':
        this.applyQuickFixes(request.data);
        break;
      default:
        break;
    }
    sendResponse({ received: true });
  }

  setupContextMenu() {
    // Add right-click listener
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection().toString();
      if (selection) {
        this.selectedElement = e.target;
      }
    });
  }

  monitorTextFields() {
    // Find all text input fields
    const textFields = document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]');
    
    textFields.forEach(field => {
      // Add amita indicator
      this.addFieldIndicator(field);
      
      // Add debounced listener for typing
      let timeout;
      field.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (field.value?.length > 50 || field.textContent?.length > 50) {
            this.analyzeFieldContent(field);
          }
        }, 1000);
      });
    });
  }

  addFieldIndicator(field) {
    // Skip if already has indicator
    if (field.dataset.amitaEnabled) return;
    
    field.dataset.amitaEnabled = 'true';
    
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'amita-field-indicator';
    indicator.innerHTML = `
      <div class="amita-indicator-badge">
        <span class="amita-logo">🔍</span>
        <span class="amita-text">amita.ai</span>
      </div>
    `;
    
    // Position indicator relative to field
    const rect = field.getBoundingClientRect();
    indicator.style.position = 'absolute';
    indicator.style.top = `${rect.top + window.scrollY - 30}px`;
    indicator.style.right = `${document.body.clientWidth - rect.right + window.scrollX}px`;
    
    // Add click handler
    indicator.addEventListener('click', () => {
      this.analyzeFieldContent(field);
    });
    
    document.body.appendChild(indicator);
  }

  async analyzePageContent() {
    // Get main content of the page
    const content = this.extractPageText();
    
    if (!content || content.length < 50) {
      this.showToast('No sufficient text found on this page', 'warning');
      return;
    }
    
    await this.performAnalysis(content, 'page');
  }

  async analyzeSelectedText() {
    const selection = window.getSelection().toString();
    
    if (!selection || selection.length < 50) {
      this.showToast('Please select at least 50 characters', 'warning');
      return;
    }
    
    await this.performAnalysis(selection, 'selection');
  }

  async analyzeFieldContent(field) {
    const content = field.value || field.textContent;
    
    if (!content || content.length < 50) {
      return;
    }
    
    await this.performAnalysis(content, 'field', field);
  }

  async performAnalysis(text, type, element = null) {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.showLoadingOverlay();
    
    try {
      // Send to background script for API call
      const response = await chrome.runtime.sendMessage({
        action: 'analyze',
        data: { text, type }
      });
      
      if (response.success) {
        this.showAnalysisResults(response.data, element);
      } else {
        this.showToast(response.error || 'Analysis failed', 'error');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      this.showToast('Connection error', 'error');
    } finally {
      this.isAnalyzing = false;
      this.hideLoadingOverlay();
    }
  }

  showAnalysisResults(data, element) {
    // Create results overlay
    const overlay = document.createElement('div');
    overlay.className = 'amita-results-overlay';
    overlay.innerHTML = `
      <div class="amita-results-container">
        <div class="amita-results-header">
          <h3>Analysis Results</h3>
          <button class="amita-close-btn">×</button>
        </div>
        
        <div class="amita-results-content">
          <div class="amita-score-grid">
            <div class="amita-score-item">
              <div class="amita-score-label">AI Risk</div>
              <div class="amita-score-value ${this.getRiskClass(data.ai_confidence_score)}">
                ${Math.round(data.ai_confidence_score)}%
              </div>
            </div>
            <div class="amita-score-item">
              <div class="amita-score-label">Authenticity</div>
              <div class="amita-score-value amita-score-good">
                ${Math.round(data.authenticity_score)}%
              </div>
            </div>
          </div>
          
          ${data.sections_flagged?.length > 0 ? `
            <div class="amita-flagged-sections">
              <h4>Flagged Sections (${data.sections_flagged.length})</h4>
              <div class="amita-sections-list">
                ${data.sections_flagged.map(section => `
                  <div class="amita-section-item">
                    <div class="amita-section-text">"${this.truncateText(section.text, 100)}"</div>
                    <div class="amita-section-reason">${section.reason}</div>
                    ${section.suggestion ? `
                      <button class="amita-apply-btn" data-original="${section.text}" data-suggestion="${section.suggestion}">
                        Apply Fix
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="amita-actions">
            <button class="amita-btn amita-btn-primary" id="amita-apply-all">
              Apply All Fixes
            </button>
            <button class="amita-btn amita-btn-secondary" id="amita-view-details">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    overlay.querySelector('.amita-close-btn').addEventListener('click', () => {
      overlay.remove();
    });
    
    overlay.querySelectorAll('.amita-apply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const original = e.target.dataset.original;
        const suggestion = e.target.dataset.suggestion;
        this.applySingleFix(original, suggestion, element);
        e.target.disabled = true;
        e.target.textContent = 'Applied';
      });
    });
    
    const applyAllBtn = overlay.querySelector('#amita-apply-all');
    if (applyAllBtn && data.sections_flagged?.length > 0) {
      applyAllBtn.addEventListener('click', () => {
        this.applyAllFixes(data.sections_flagged, element);
        overlay.remove();
      });
    }
    
    const viewDetailsBtn = overlay.querySelector('#amita-view-details');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', () => {
        window.open('https://amita.ai/dashboard', '_blank');
      });
    }
    
    // Store in session
    this.lastAnalysis = data;
  }

  applySingleFix(original, suggestion, element) {
    if (!element) {
      // Try to find in current selection
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const text = range.toString();
        if (text.includes(original)) {
          const newText = text.replace(original, suggestion);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
        }
      }
    } else {
      // Apply to specific element
      const content = element.value || element.textContent;
      const newContent = content.replace(original, suggestion);
      
      if (element.value !== undefined) {
        element.value = newContent;
      } else {
        element.textContent = newContent;
      }
      
      // Trigger input event for frameworks
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    this.showToast('Fix applied successfully', 'success');
  }

  applyAllFixes(sections, element) {
    let content = element ? (element.value || element.textContent) : '';
    
    if (!content) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        content = selection.getRangeAt(0).toString();
      }
    }
    
    // Apply all suggestions
    sections.forEach(section => {
      if (section.suggestion) {
        content = content.replace(section.text, section.suggestion);
      }
    });
    
    if (element) {
      if (element.value !== undefined) {
        element.value = content;
      } else {
        element.textContent = content;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    this.showToast(`Applied ${sections.length} fixes`, 'success');
  }

  extractPageText() {
    // Try to find main content areas
    const contentSelectors = [
      'main', 'article', '[role="main"]', 
      '.content', '#content', '.post', '.entry-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText;
      }
    }
    
    // Fallback to body text
    return document.body.innerText;
  }

  getRiskClass(score) {
    if (score < 20) return 'amita-score-good';
    if (score < 40) return 'amita-score-medium';
    return 'amita-score-bad';
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  showLoadingOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'amita-loading-overlay';
    this.overlay.innerHTML = `
      <div class="amita-loader">
        <div class="amita-spinner"></div>
        <div class="amita-loading-text">Analyzing with amita.ai...</div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  hideLoadingOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `amita-toast amita-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('amita-toast-show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('amita-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize content script
const amitaCS = new AmitaContentScript();

// Inject CSS styles
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = chrome.runtime.getURL('src/styles.css');
document.head.appendChild(style);