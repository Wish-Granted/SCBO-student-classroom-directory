const { app, BrowserWindow, session } = require('electron');

const EMINERVA_LOGIN_URL = 'https://eminerva.bne.catholic.edu.au/eMinerva';
const EMINERVA_LOGGED_IN_URL_PATTERN = 'UserPreferences';
const BACKEND_URL = 'http://localhost:8000';

let mainWindow;

function createLoginWindow() {
  const loginWin = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      session: session.fromPartition('persist:eminerva'),
    },
  });

  loginWin.loadURL(EMINERVA_LOGIN_URL);

  loginWin.webContents.on('did-navigate', async (event, url) => {
    if (url.includes(EMINERVA_LOGGED_IN_URL_PATTERN)) {
      await captureAndSendCookies(loginWin);
      loginWin.close();
      createMainWindow();
    }
  });
}

async function captureAndSendCookies(win) {
  const rawCookies = await win.webContents.session.cookies.get({
    domain: 'eminerva.bne.catholic.edu.au',
  });

  const targetNames = ["MRHSession", "ASP.NET_SessionId"];
  const filteredCookies = rawCookies.filter(c => targetNames.includes(c.name));

  const cookies = filteredCookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
  }));

  // Use the SAME partition that mainWindow will later load in, and use
  // that session's own fetch (session-aware) so the Set-Cookie response
  // from Flask actually gets stored in this partition's cookie jar,
  // instead of vanishing into the stateless global/main-process fetch.
  const appSession = session.fromPartition('persist:app');

  const resp = await appSession.fetch(`${BACKEND_URL}/api/auth/eminerva-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies }),
  });

  if (!resp.ok) {
    console.error('Failed to establish eMinerva session with backend:', resp.status, await resp.text());
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      session: session.fromPartition('persist:app'),
    },
  });

  mainWindow.loadURL("http://127.0.0.1:8000/api/students/search?q=Dylan");
}

async function checkExistingSession() {
  try {
    // Must check via the same partition's session-aware fetch, otherwise
    // the Flask session cookie set in captureAndSendCookies is never sent.
    const appSession = session.fromPartition('persist:app');
    const resp = await appSession.fetch(`${BACKEND_URL}/api/auth/whoami`);
    if (resp.ok) {
      createMainWindow();
      return;
    }
  } catch (e) {
    // backend unreachable, fall through to login
  }
  createLoginWindow();
}

app.whenReady().then(checkExistingSession);