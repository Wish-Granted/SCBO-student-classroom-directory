const { app, BrowserWindow, session, ipcMain, Menu } = require('electron');
const path = require('path');

const EMINERVA_LOGIN_URL = 'https://eminerva.bne.catholic.edu.au/eMinerva';
const EMINERVA_LOGGED_IN_URL_PATTERN = 'eminerva.bne.catholic.edu.au';
const BACKEND_URL = 'http://localhost:8000';

let mainWindow;
let loginWindow;

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      session: session.fromPartition('persist:eminerva'),
    },
  });

  loginWindow.loadURL(EMINERVA_LOGIN_URL);

  loginWindow.on('closed', () => {
    loginWindow = null;
  });

  loginWindow.webContents.on('did-navigate', async (event, url) => {
    const is401Error = await loginWindow.webContents.executeJavaScript(`
      (() => {
        const errorHeading = document.querySelector('#content .content-container h2');
        return errorHeading && errorHeading.innerText.includes('401 - Unauthorized');
      })()
    `);
    if (url.includes(EMINERVA_LOGGED_IN_URL_PATTERN) && !is401Error) {
      await captureAndSendCookies(loginWindow);
      loginWindow.close();

      if (mainWindow) {
        mainWindow.webContents.reload();
      } else {
        createMainWindow();
      }
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
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    },
  });
  mainWindow.loadURL("http://localhost:8000/")
    .catch((err) => {
      console.error('Failed to load main window URL — is the backend running on the expected port?', err);
    });
}

function setupIpcHandlers() {
  ipcMain.on('eminerva-session-expired', handleSessionExpired);
}

function handleSessionExpired() {
  createLoginWindow();
}

async function logout() {
  await session.fromPartition('persist:eminerva').clearStorageData();

  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    // backend unreachable -- still proceed with local logout
  }

  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  createLoginWindow();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Log out', click: logout },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [{ role: 'toggleDevTools' }, { role: 'reload' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
    console.error('Could not reach backend at', BACKEND_URL, '- is it running on the expected port?', e);
  }
  createLoginWindow();
}

app.whenReady().then(() => {
  setupIpcHandlers()
  buildMenu()
  checkExistingSession()
});