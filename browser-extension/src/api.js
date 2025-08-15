// API helper functions
export async function analyzeText(text) {
  const response = await chrome.runtime.sendMessage({
    action: 'analyze',
    data: { text, type: 'manual' }
  });
  
  return response;
}

export async function applyQuickFixes(text, fixes) {
  const response = await chrome.runtime.sendMessage({
    action: 'applyFixes',
    data: { text, fixes }
  });
  
  return response;
}

export async function getAnalysisHistory() {
  const stored = await chrome.storage.local.get(['analysisHistory']);
  return stored.analysisHistory || [];
}

export async function saveAnalysis(analysis) {
  const history = await getAnalysisHistory();
  history.unshift({
    ...analysis,
    timestamp: Date.now()
  });
  
  // Keep only last 50 analyses
  if (history.length > 50) {
    history.length = 50;
  }
  
  await chrome.storage.local.set({ analysisHistory: history });
}