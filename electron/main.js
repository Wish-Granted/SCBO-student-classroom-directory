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

  const cookies = rawCookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
  }));

  await fetch(`${BACKEND_URL}/api/auth/eminerva-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cookies }),
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      session: session.fromPartition('persist:app'),
    },
  });

  mainWindow.loadURL(BACKEND_URL);
}

async function checkExistingSession() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/auth/whoami`, {
      credentials: 'include',
    });
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