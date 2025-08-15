// Authentication helper functions
export async function getAuthToken() {
  const stored = await chrome.storage.local.get(['authToken']);
  return stored.authToken || null;
}

export async function setAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

export async function isAuthenticated() {
  const token = await getAuthToken();
  return !!token;
}

export async function logout() {
  await chrome.storage.local.remove(['authToken', 'user', 'stats']);
  return true;
}

export async function getUser() {
  const stored = await chrome.storage.local.get(['user']);
  return stored.user || null;
}