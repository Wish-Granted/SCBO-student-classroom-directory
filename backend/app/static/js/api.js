async function apiFetch(url, options = {}) {
  const resp = await fetch(url, { ...options, credentials: 'include' });

  if (resp.status === 401 && window.electronAPI) {
    window.electronAPI.notifySessionExpired();
  }

  return resp;
}