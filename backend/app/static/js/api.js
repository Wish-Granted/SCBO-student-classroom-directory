async function apiFetch(url, options = {}) {
  const resp = await fetch(url, { ...options, credentials: 'include' });

  if (resp.status === 401) {
    if (window.electronAPI) window.electronAPI.notifySessionExpired();
    else window.location.href = '/login';
  }

  return resp;
}