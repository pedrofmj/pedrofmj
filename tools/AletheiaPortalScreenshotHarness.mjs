#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const portalUrl = trimTrailingSlash(process.env.ALETHEIA_PORTAL_URL || 'https://aletheia.egypteam.com');
const uiUrl = trimTrailingSlash(process.env.ALETHEIA_UI_URL || 'https://aletheia-ui.egypteam.com');
const outputDir = path.resolve(rootDir, process.env.ALETHEIA_OUTPUT_DIR || 'platforms/aletheia/screenshots');
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

const demo = {
  name: process.env.ALETHEIA_DEMO_NAME || 'Portfolio Demo Researcher',
  email: process.env.ALETHEIA_DEMO_EMAIL || `portfolio.demo.${timestamp}@example.com`,
  password: process.env.ALETHEIA_DEMO_PASSWORD || `Aletheia-Demo-${timestamp}!`,
};

const admin = await resolveAdminCredentials();

const chromeBin = process.env.CHROME_BIN || 'chromium-browser';
const width = Number(process.env.ALETHEIA_SCREENSHOT_WIDTH || 1440);
const height = Number(process.env.ALETHEIA_SCREENSHOT_HEIGHT || 1000);
const ticTacToeScriptCoreAgentLabel = 'Tic-Tac-Toe AIMA Alpha-Beta (Script Core)';

const screenshots = [
  ['01-public-soon.png', 'Public release page'],
  ['02-register-request-access.png', 'Portal access request form'],
  ['03-register-submitted.png', 'Access request submitted'],
  ['04-portal-sign-in.png', 'Portal sign-in form'],
  ['05-portal-sign-in-submitted.png', 'Portal sign-in submitted'],
  ['06-dashboard.png', 'Approved user dashboard'],
  ['07-marketplace.png', 'Aletheia marketplace'],
  ['08-applications-installed.png', 'Installed applications'],
  ['09-aletheia-web-ui-console-handoff.png', 'Aletheia console handoff'],
  ['10-aletheia-matrix-workbench.png', 'Matrix workbench'],
  ['11-aletheia-text-search.png', 'Text search workspace'],
  ['12-tictactoe-game-server-dialog.png', 'Tic-Tac-Toe remote game server setup'],
  ['13-tictactoe-game-server-created.png', 'Tic-Tac-Toe remote game server created'],
  ['14-tictactoe-human-client-opened.png', 'Human Tic-Tac-Toe remote client'],
  ['15-tictactoe-scripted-agent-selection.png', 'Alpha-beta JavaScript scripted core agent selection'],
  ['16-tictactoe-scripted-agent-joined.png', 'Alpha-beta scripted agent joined the match'],
  ['17-tictactoe-human-move-1.png', 'Tic-Tac-Toe human move 1'],
  ['18-tictactoe-alpha-beta-response-1.png', 'Tic-Tac-Toe alpha-beta response 1'],
  ['19-tictactoe-human-move-2.png', 'Tic-Tac-Toe human move 2'],
  ['20-tictactoe-alpha-beta-response-2.png', 'Tic-Tac-Toe alpha-beta response 2'],
  ['21-tictactoe-human-move-3.png', 'Tic-Tac-Toe human move 3'],
  ['22-tictactoe-alpha-beta-response-3.png', 'Tic-Tac-Toe alpha-beta response 3'],
  ['23-tictactoe-human-move-4.png', 'Tic-Tac-Toe human move 4'],
  ['24-tictactoe-alpha-beta-response-4.png', 'Tic-Tac-Toe alpha-beta response 4'],
  ['25-tictactoe-human-final-move.png', 'Tic-Tac-Toe human final move and match result'],
];

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out connecting to Chrome DevTools.')), 10000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timeout);
        reject(event.error || new Error('Chrome DevTools websocket error.'));
      }, { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message}: ${message.error.data || ''}`));
        else resolve(message.result || {});
        return;
      }

      if (message.method && this.events.has(message.method)) {
        for (const handler of this.events.get(message.method)) handler(message.params || {});
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  on(method, handler) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(handler);
  }

  close() {
    this.ws?.close();
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await launchChrome();
  const page = await newPage(browser.port);

  try {
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    if (process.argv.includes('--direct-web-ui-only')) {
      await captureDirectWebUi(page);
      await writeReadme();
      console.log(`Aletheia direct Web UI screenshots written to ${outputDir}`);
      return;
    }

    if (process.argv.includes('--skip-registration') || process.env.ALETHEIA_SKIP_REGISTRATION === '1') {
      console.log(`Skipping registration for ${demo.email}`);
    } else {
      await capturePublicAndRegistration(page);
      if (process.argv.includes('--register-only') || process.env.ALETHEIA_REGISTER_ONLY === '1') {
        console.log(`Registered demo user ${demo.email}`);
        return;
      }
    }

    if (admin.email && admin.password) {
      await approveAndGrant(page);
    }

    await loginAsDemoUser(page);
    await captureAuthenticatedFlow(page);

    await writeReadme();
    console.log(`Aletheia screenshots written to ${outputDir}`);
  } catch (error) {
    try {
      if (process.argv.includes('--direct-web-ui-only')) {
        await page.clearSensitiveVaadinFields();
      }
      await page.screenshot('debug-error.png');
      const state = await page.debugState(demo.email);
      console.error(`Debug state: ${JSON.stringify(state, null, 2)}`);
    } catch {
      // Keep the original failure visible if the debug capture also fails.
    }
    throw error;
  } finally {
    page.close();
    browser.process.kill('SIGTERM');
  }
}

async function capturePublicAndRegistration(page) {
  await page.goto(`${portalUrl}/soon`);
  await page.waitForText('Aletheia', 20000);
  await page.screenshot('01-public-soon.png');

  await page.goto(`${portalUrl}/register`);
  await page.waitForSelector('input#name', 20000);
  await page.screenshot('02-register-request-access.png');

  await page.fill('input#name', demo.name);
  await page.fill('input#email', demo.email);
  await page.fill('input#password', demo.password);
  await page.fill('input#password_confirmation', demo.password);
  await page.clickText('button', 'Request access');
  await page.waitForText('Access request received', 30000);
  await page.screenshot('03-register-submitted.png');
}

async function approveAndGrant(page) {
  await login(page, admin.email, admin.password);
  await page.goto(`${portalUrl}/admin/users`);
  await page.waitForText(demo.email, 30000);

  await page.evalForUserRow(demo.email, `
    const row = userRow;
    const approve = [...row.querySelectorAll('button')].find((button) => button.textContent.includes('Approve'));
    if (approve) approve.click();
  `);
  await page.waitForIdle();

  await page.evalForUserRow(demo.email, `
    const row = userRow;
    const checkbox = [...row.querySelectorAll('label')].find((label) => label.textContent.includes('Store beta'))?.querySelector('input');
    if (checkbox && !checkbox.checked) checkbox.click();
  `);
  await page.waitForIdle();

  await page.evalForUserRow(demo.email, `
    const row = userRow;
    const selects = row.querySelectorAll('select');
    if (selects.length >= 3) {
      const moduleSelect = selects[0];
      const option = [...moduleSelect.options].find((candidate) => /Aletheia|Web UI/i.test(candidate.textContent));
      if (option) {
        moduleSelect.value = option.value;
        moduleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  `);
  await page.waitForIdle();

  await page.evalForUserRow(demo.email, `
    const row = userRow;
    const grant = [...row.querySelectorAll('button')].find((button) => button.textContent.includes('Grant'));
    if (grant) grant.click();
  `);
  await page.waitForIdle();

  await page.logout();
}

async function loginAsDemoUser(page) {
  await login(page, demo.email, demo.password);
}

async function captureDirectWebUi(page) {
  const bearerToken = await resolveWebUiBearerToken();
  if (!bearerToken) {
    throw new Error('No Web UI bearer token was available. Set ALETHEIA_WEB_UI_BEARER_TOKEN or use --token-from-demo-guide.');
  }

  await page.goto(uiUrl);
  await page.waitForText('Sign In', 45000);
  await page.screenshot('08-aletheia-web-ui-login.png');

  await page.setVaadinField('Matrix Name', 'Portfolio Demo Matrix');
  await page.setVaadinField('Matrix Base URL', portalUrl);
  const bearerFill = await page.setVaadinField('Bearer Token', bearerToken);
  console.log(`Bearer token field fill: ${bearerFill.ok ? 'ok' : 'not found'}`);
  await page.tryClearVaadinSelect('Tenant');
  await page.clickText('vaadin-button, button', 'Enter Workbench');
  await page.waitForText('Matrix Servers', 90000);
  await page.waitForIdle(5000);
  await page.screenshot('09-aletheia-web-ui-workbench.png');

  await page.clickText('vaadin-tab, button, vaadin-button', 'Matrix');
  await page.waitForIdle(2500);
  await page.screenshot('10-aletheia-matrix-servers.png');

  await page.clickText('vaadin-tab, button, vaadin-button', 'Text Search');
  await page.waitForIdle(2500);
  await page.screenshot('11-aletheia-text-search.png');
}

async function resolveWebUiBearerToken() {
  if (process.env.ALETHEIA_WEB_UI_BEARER_TOKEN) return process.env.ALETHEIA_WEB_UI_BEARER_TOKEN;
  if (!process.argv.includes('--token-from-demo-guide')) return '';

  const portalRepo = process.env.ALETHEIA_PORTAL_REPO || '';
  if (!portalRepo) return '';
  const guide = await readFile(path.join(portalRepo, 'docs/markdown/portal-end-to-end-demo-guide.md'), 'utf8');
  const issuer = matchEnvAssignment(guide, 'ALETHEIA_OIDC_ISSUER') || `${portalUrl}/oidc`;
  const clientId = matchEnvAssignment(guide, 'ALETHEIA_OIDC_ADMIN_CLIENT_ID') || matchEnvAssignment(guide, 'ALETHEIA_OIDC_CLIENT_ID');
  const clientSecret = matchEnvAssignment(guide, 'ALETHEIA_OIDC_ADMIN_CLIENT_SECRET') || matchEnvAssignment(guide, 'ALETHEIA_OIDC_CLIENT_SECRET');
  const scope = matchEnvAssignment(guide, 'ALETHEIA_OIDC_ADMIN_SCOPES') || 'openid profile email';
  if (!issuer || !clientId || !clientSecret) return '';

  const metadataResponse = await fetch(`${trimTrailingSlash(issuer)}/.well-known/openid-configuration`);
  if (!metadataResponse.ok) throw new Error(`OIDC metadata failed with HTTP ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  const tokenEndpoint = metadata.token_endpoint;
  if (!tokenEndpoint) throw new Error('OIDC metadata did not include token_endpoint.');

  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    subject: process.env.ALETHEIA_OIDC_SUBJECT || "service:aletheia-portal",
  });
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form,
  });
  if (!tokenResponse.ok) throw new Error(`OIDC token request failed with HTTP ${tokenResponse.status}`);
  const tokenSet = await tokenResponse.json();
  return tokenSet.access_token || '';
}

function matchEnvAssignment(source, key) {
  const match = source.match(new RegExp(`^${key}=([^\n\r]+)`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

async function captureAuthenticatedFlow(page) {
  await page.goto(`${portalUrl}/dashboard`);
  await page.waitForText('Cognitive Cloud Control Center', 45000);
  await page.screenshot('06-dashboard.png');

  await page.goto(`${portalUrl}/modules/store`);
  await page.waitForIdle(4000);
  await assertModuleStoreAvailable(page);
  await page.waitForText('Marketplace', 45000);
  await page.screenshot('07-marketplace.png');

  await ensureAletheiaWebUiModule(page);

  await page.goto(`${portalUrl}/modules`);
  await page.waitForText('Applications', 45000);
  await page.waitForTextAny(['Aletheia Web UI', 'Web UI', 'Launch'], 45000);
  await page.screenshot('08-applications-installed.png');

  await page.goto(`${portalUrl}/dashboard`);
  await page.waitForText('Cognitive Cloud Control Center', 45000);
  await page.navigateTextTargetSameTab('a, button', 'Open Console');
  await page.waitForUrl((url) => url.startsWith(uiUrl), 90000);
  await page.waitForTextAny(['Matrix Servers', 'Aletheia Web Workbench', 'Desktop Workbench', 'Text Search', 'Sign In'], 120000);
  await page.waitForIdle(10000);
  await page.screenshot('09-aletheia-web-ui-console-handoff.png');

  await page.clickText('vaadin-tab, button, vaadin-button, a', 'Matrix');
  await page.waitForIdle(2500);
  await page.screenshot('10-aletheia-matrix-workbench.png');

  await page.clickText('vaadin-tab, button, vaadin-button, a', 'Text Search');
  await page.waitForIdle(2500);
  await page.screenshot('11-aletheia-text-search.png');

  await captureTicTacToeMatch(page);
}

async function captureTicTacToeMatch(page) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: Math.max(height, 1250),
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.waitForTextAny(['Aletheia Workbench', 'Matrix ready'], 90000);
  await page.clickText('vaadin-tab, button, vaadin-button, a', 'Matrix');
  await page.waitForText('Matrix Servers', 45000);

  await createRemoteTicTacToeGameServer(page);
  await openHumanTicTacToeClient(page);
  await openScriptedAlphaBetaTicTacToeClient(page);
  await playHumanVsAlphaBetaTicTacToe(page);
}

async function createRemoteTicTacToeGameServer(page) {
  await page.clickByAriaLabel('New Game Server');
  await page.waitForText('New Game Server', 30000);
  await page.setVaadinSelectOption('Game', 'tictactoe');
  await page.waitFor(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fields = [...document.querySelectorAll('vaadin-integer-field, vaadin-number-field, vaadin-text-field')];
    return fields.some((field) => {
      const shadowLabel = field.shadowRoot?.querySelector('[part="label"]')?.textContent;
      const labels = [field.label, field.getAttribute('label'), shadowLabel, field.textContent].filter(Boolean).map(normalize);
      const input = field.shadowRoot?.querySelector('input');
      return labels.some((label) => label.includes('game port')) && String(field.value || input?.value || '').trim().length > 0;
    });
  }, 10000);
  await page.screenshot('12-tictactoe-game-server-dialog.png');
  await page.clickDialogButton('Create');
  await page.waitForIdle(12000);
  await page.waitFor(() => {
    const text = document.body?.innerText || '';
    return /ENV-[A-Z0-9]+[^\n]*TICTACTOE/i.test(text) || /tictactoe\s*\(NDJSON/i.test(text);
  }, 180000);
  await page.screenshot('13-tictactoe-game-server-created.png');
}

async function openHumanTicTacToeClient(page) {
  await page.clickByAriaLabel('Join Server (Board)');
  await page.waitForText('Join Server (Board)', 30000);
  await page.setVaadinSelectOption('Mode', 'HUMAN');
  await page.clickDialogButton('Open');
  await page.waitForTextAny(['[Human]', 'Waiting for opponent', 'Assigned role X', 'Your turn'], 120000);
  await page.waitForIdle(5000);
  await page.layoutTicTacToeRemoteWindows();
  await page.screenshot('14-tictactoe-human-client-opened.png');
}

async function openScriptedAlphaBetaTicTacToeClient(page) {
  await page.clickByAriaLabel('Join Server (Board)');
  await page.waitForText('Join Server (Board)', 30000);
  await page.setVaadinSelectOption('Mode', 'MACHINE');
  await page.clickDialogButton('Open');
  await page.waitForText('Choose Machine Agent', 120000);
  await page.setVaadinSelectOptionByText(ticTacToeScriptCoreAgentLabel);
  await page.screenshot('15-tictactoe-scripted-agent-selection.png');
  await page.clickDialogButton('Open');
  await page.waitForTextAny([ticTacToeScriptCoreAgentLabel, 'Tic-Tac-Toe Remote Client (SCRIPTED)', 'Your turn as X', 'Match in progress'], 120000);
  await page.waitForIdle(6000);
  await page.layoutTicTacToeRemoteWindows();
  await page.screenshot('16-tictactoe-scripted-agent-joined.png');
}

async function playHumanVsAlphaBetaTicTacToe(page) {
  const humanScreenshots = [
    '17-tictactoe-human-move-1.png',
    '19-tictactoe-human-move-2.png',
    '21-tictactoe-human-move-3.png',
    '23-tictactoe-human-move-4.png',
    '25-tictactoe-human-final-move.png',
  ];
  const agentScreenshots = [
    '18-tictactoe-alpha-beta-response-1.png',
    '20-tictactoe-alpha-beta-response-2.png',
    '22-tictactoe-alpha-beta-response-3.png',
    '24-tictactoe-alpha-beta-response-4.png',
  ];
  const captured = new Set();

  let state = await page.waitForTicTacToeHumanState((candidate) => candidate.canMove || candidate.terminal, 120000);
  for (let turn = 0; turn < humanScreenshots.length; turn++) {
    if (state.terminal) break;
    if (!state.canMove) {
      state = await page.waitForTicTacToeHumanState((candidate) => candidate.canMove || candidate.terminal, 120000);
      if (state.terminal) break;
    }

    const beforeCount = countBoardMarks(state.cells);
    const move = chooseHumanTicTacToeMove(state);
    await page.clickTicTacToeHumanCell(move.row, move.col);

    if (turn === humanScreenshots.length - 1) {
      await page.waitForTextAny(['Match finished', 'Winner: DRAW', 'Winner: X', 'Winner: O'], 120000);
      await page.layoutTicTacToeRemoteWindows();
      await page.screenshot(humanScreenshots[turn]);
      captured.add(humanScreenshots[turn]);
      break;
    }

    state = await page.waitForTicTacToeHumanState(
      (candidate) => candidate.terminal || countBoardMarks(candidate.cells) >= beforeCount + 1,
      90000);
    await page.layoutTicTacToeRemoteWindows();
    await page.screenshot(humanScreenshots[turn]);
    captured.add(humanScreenshots[turn]);
    if (state.terminal) break;

    const responseScreenshot = agentScreenshots[turn];
    if (responseScreenshot) {
      state = await page.waitForTicTacToeHumanState(
        (candidate) => candidate.terminal || (candidate.canMove && countBoardMarks(candidate.cells) >= beforeCount + 2),
        120000);
      await page.layoutTicTacToeRemoteWindows();
      await page.screenshot(responseScreenshot);
      captured.add(responseScreenshot);
      if (state.terminal) break;
    }
  }

  if (!captured.has('25-tictactoe-human-final-move.png')) {
    state = await page.waitForTicTacToeHumanState(
      (candidate) => candidate.terminal || countBoardMarks(candidate.cells) >= 9,
      30000);
    await page.layoutTicTacToeRemoteWindows();
    await page.screenshot('25-tictactoe-human-final-move.png');
  }
}

function countBoardMarks(cells) {
  return cells.filter((cell) => cell === 'X' || cell === 'O').length;
}

function chooseHumanTicTacToeMove(state) {
  const human = state.humanMark || 'X';
  const agent = human === 'X' ? 'O' : 'X';
  const cells = state.cells.map((cell) => (cell === 'X' || cell === 'O' ? cell : ''));
  const legal = new Set(state.legalMoves.map((move) => move.row * 3 + move.col));
  const order = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter((index) => legal.has(index));
  let bestMove = order[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of order) {
    cells[move] = human;
    const score = minimaxTicTacToe(cells, agent, human, agent);
    cells[move] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (!Number.isInteger(bestMove)) {
    throw new Error(`No legal human Tic-Tac-Toe move was available. State: ${JSON.stringify(state)}`);
  }

  return { row: Math.floor(bestMove / 3), col: bestMove % 3 };
}

function minimaxTicTacToe(cells, current, human, agent) {
  const winner = ticTacToeWinner(cells);
  if (winner === human) return 1;
  if (winner === agent) return -1;
  const legal = cells.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0);
  if (legal.length === 0) return 0;

  const maximizing = current === human;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  const next = current === 'X' ? 'O' : 'X';
  const order = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter((index) => legal.includes(index));

  for (const move of order) {
    cells[move] = current;
    const score = minimaxTicTacToe(cells, next, human, agent);
    cells[move] = '';
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function ticTacToeWinner(cells) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return '';
}

async function assertModuleStoreAvailable(page) {
  const state = await page.debugState('');
  if (state.url.includes('/modules/store') && /404\s+NOT FOUND/i.test(state.text)) {
    throw new Error(`Aletheia Module Store is not available for ${demo.email}. Enable Store beta for this user or grant Aletheia Web UI before rerunning.`);
  }
}

async function ensureAletheiaWebUiModule(page) {
  const state = await page.debugState('');
  if (/Aletheia Web UI/i.test(state.text) && /Installed/i.test(state.text)) {
    console.log('Aletheia Web UI is already installed.');
    return;
  }

  const clickedModuleAction = await page.tryClickModuleAction('Aletheia Web UI', ['Install']);
  if (!clickedModuleAction.clicked) {
    throw new Error('Could not find an enabled Install action for Aletheia Web UI in the module store.');
  }

  console.log(`Clicked ${clickedModuleAction.text} for Aletheia Web UI.`);
  await page.waitForTextAny(['Module installed', 'Applications', 'Installed', 'Launch'], 120000);
  await page.waitForIdle(10000);
}

async function login(page, email, password) {
  await page.goto(`${portalUrl}/login`);
  await page.waitForSelector('input#email', 20000);
  await page.screenshot('04-portal-sign-in.png');
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.submitFormContaining('input#password');
  await page.waitForIdle(9000);
  await page.screenshot('05-portal-sign-in-submitted.png');
  const state = await page.debugState(email);
  console.log(`Post-login state: ${JSON.stringify(state, null, 2)}`);
}

async function launchChrome() {
  const port = 9300 + Math.floor(Math.random() * 400);
  const userDataDir = `/tmp/aletheia-chrome-${process.pid}-${Date.now()}`;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ];

  const child = spawn(chromeBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (!/DevTools listening/.test(text) && !/Written to file/.test(text)) {
      process.stderr.write(text);
    }
  });

  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return { process: child, port };
    } catch {
      await sleep(250);
    }
  }

  child.kill('SIGTERM');
  throw new Error('Chrome did not start a DevTools endpoint.');
}

async function newPage(port) {
  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create Chrome target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  return new BrowserPage(client);
}

class BrowserPage {
  constructor(client) {
    this.client = client;
  }

  send(method, params = {}) {
    return this.client.send(method, params);
  }

  close() {
    this.client.close();
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await this.waitForIdle(1500);
  }

  async waitForIdle(ms = 1500) {
    await sleep(ms);
  }

  async waitForUrl(predicate, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const url = await this.evaluate(() => window.location.href);
      if (predicate(url)) return;
      await sleep(500);
    }
    throw new Error('Timed out waiting for page URL.');
  }

  async waitForSelector(selector, timeoutMs = 30000) {
    await this.waitFor((sel) => !!document.querySelector(sel), timeoutMs, selector);
  }

  async waitForText(text, timeoutMs = 30000) {
    await this.waitFor((needle) => document.body?.innerText.includes(needle), timeoutMs, text);
  }

  async waitForTextAny(texts, timeoutMs = 30000) {
    await this.waitFor((needles) => needles.some((needle) => document.body?.innerText.includes(needle)), timeoutMs, texts);
  }

  async waitFor(predicate, timeoutMs, arg) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await this.evaluate(predicate, arg);
      if (result) return;
      await sleep(500);
    }
    throw new Error('Timed out waiting for page condition.');
  }

  async evaluate(fn, arg) {
    const source = typeof fn === 'function'
      ? `(${fn.toString()})(${JSON.stringify(arg)})`
      : fn;
    const result = await this.send('Runtime.evaluate', {
      expression: source,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Page evaluation failed.');
    }
    return result.result?.value;
  }

  async setVaadinField(label, value) {
    return this.evaluate(({ label, value }) => {
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area, vaadin-integer-field, vaadin-number-field')];
      const normalized = label.toLowerCase();
      const field = fields.find((candidate) => {
        const shadowLabel = candidate.shadowRoot?.querySelector('[part="label"]')?.textContent;
        const labels = [candidate.label, candidate.getAttribute('label'), shadowLabel, candidate.textContent]
          .filter(Boolean)
          .map((item) => item.toLowerCase());
        return labels.some((item) => item.includes(normalized));
      });
      if (!field) {
        return {
          ok: false,
          labels: fields.map((candidate) => candidate.label || candidate.getAttribute('label') || candidate.shadowRoot?.querySelector('[part="label"]')?.textContent || ''),
        };
      }
      const input = field.shadowRoot?.querySelector('input, textarea');
      field.value = value;
      if (input) {
        input.focus();
        input.value = value;
        input.dispatchEvent(new InputEvent('input', { data: value, inputType: 'insertText', bubbles: true, composed: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
      field.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return {
        ok: true,
        valueLength: String(field.value || '').length,
        inputLength: input ? String(input.value || '').length : null,
      };
    }, { label, value });
  }

  async typeVaadinField(label, value) {
    const focused = await this.evaluate((label) => {
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area, vaadin-integer-field, vaadin-number-field')];
      const normalized = label.toLowerCase();
      const field = fields.find((candidate) => {
        const shadowLabel = candidate.shadowRoot?.querySelector('[part="label"]')?.textContent;
        const labels = [candidate.label, candidate.getAttribute('label'), shadowLabel, candidate.textContent]
          .filter(Boolean)
          .map((item) => item.toLowerCase());
        return labels.some((item) => item.includes(normalized));
      });
      if (!field) return false;
      const input = field.shadowRoot?.querySelector('input, textarea');
      if (!input) return false;
      input.focus();
      input.select();
      return true;
    }, label);
    if (!focused) return false;
    await this.send('Input.insertText', { text: value });
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await this.waitForIdle(300);
    return true;
  }

  async clearSensitiveVaadinFields() {
    return this.evaluate(() => {
      const labels = ['bearer token', 'password'];
      for (const field of document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-integer-field, vaadin-number-field')) {
        const text = [field.label, field.getAttribute('label'), field.textContent]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!labels.some((label) => text.includes(label))) continue;
        field.value = '';
        const input = field.shadowRoot?.querySelector('input');
        if (input) input.value = '';
        field.dispatchEvent(new CustomEvent('value-changed', { detail: { value: '' }, bubbles: true, composed: true }));
      }
      return true;
    });
  }

  async tryClearVaadinSelect(label) {
    return this.evaluate((label) => {
      const selects = [...document.querySelectorAll('vaadin-select')];
      const normalized = label.toLowerCase();
      const select = selects.find((candidate) => {
        const labels = [candidate.label, candidate.getAttribute('label'), candidate.textContent]
          .filter(Boolean)
          .map((item) => item.toLowerCase());
        return labels.some((item) => item.includes(normalized));
      });
      if (!select) return false;
      select.value = null;
      select.dispatchEvent(new CustomEvent('value-changed', { detail: { value: null }, bubbles: true, composed: true }));
      select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return true;
    }, label);
  }

  async tryFillVaadinField(label, value) {
    return this.evaluate(({ label, value }) => {
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area, vaadin-integer-field, vaadin-number-field')];
      const normalized = label.toLowerCase();
      const field = fields.find((candidate) => {
        const labels = [candidate.label, candidate.getAttribute('label'), candidate.textContent]
          .filter(Boolean)
          .map((item) => item.toLowerCase());
        return labels.some((item) => item.includes(normalized));
      });
      if (!field) return false;
      field.value = value;
      field.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return true;
    }, { label, value });
  }

  async submitFormContaining(selector) {
    await this.evaluate((selector) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error(`Missing form input: ${selector}`);
      const form = input.closest('form');
      if (!form) throw new Error(`Missing form for input: ${selector}`);
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    }, selector);
  }

  async fill(selector, value) {
    await this.evaluate(({ selector, value }) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error(`Missing input: ${selector}`);
      input.focus();
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { selector, value });
  }

  async clickBestLaunchTarget() {
    await this.evaluate(() => {
      const elements = [...document.querySelectorAll('a, button')];
      const normalized = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const preferred = elements.find((item) => /open web ui/i.test(normalized(item.textContent)))
        || elements.find((item) => /launch/i.test(normalized(item.textContent)))
        || elements.find((item) => /aletheia web ui/i.test(normalized(item.textContent)));
      if (!preferred) throw new Error('Could not find an Aletheia launch target.');
      preferred.click();
    });
    await this.waitForIdle(4000);
  }

  async clickText(selector, text) {
    await this.evaluate(({ selector, text }) => {
      const items = [...document.querySelectorAll(selector)];
      const item = items.find((candidate) => candidate.textContent.replace(/\s+/g, ' ').trim().includes(text));
      if (!item) throw new Error(`Missing clickable ${selector} with text ${text}`);
      item.click();
    }, { selector, text });
    await this.waitForIdle(2000);
  }

  async clickExactText(selector, text) {
    await this.evaluate(({ selector, text }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const items = [...document.querySelectorAll(selector)];
      const item = items.find((candidate) => normalize(candidate.textContent) === text)
        || items.find((candidate) => normalize(candidate.textContent).includes(text));
      if (!item) throw new Error(`Missing clickable ${selector} with text ${text}`);
      item.click();
    }, { selector, text });
    await this.waitForIdle(2000);
  }

  async clickByAriaLabel(label) {
    const clicked = await this.evaluate((label) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const items = [...document.querySelectorAll('button, vaadin-button, [aria-label], [title]')];
      const target = normalize(label);
      const item = items.find((candidate) => normalize(candidate.getAttribute('aria-label')) === target || normalize(candidate.getAttribute('title')) === target)
        || items.find((candidate) => normalize(candidate.getAttribute('aria-label')).includes(target) || normalize(candidate.getAttribute('title')).includes(target));
      if (!item) return false;
      item.click();
      return true;
    }, label);
    if (!clicked) throw new Error(`Could not find element with aria-label or title ${label}`);
    await this.waitForIdle(2000);
  }

  async setVaadinSelectOption(label, optionText) {
    const opened = await this.evaluate(({ label }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const deepQueryAll = (root, selector) => {
        const out = [...root.querySelectorAll(selector)];
        for (const element of root.querySelectorAll('*')) {
          if (element.shadowRoot) out.push(...deepQueryAll(element.shadowRoot, selector));
        }
        return out;
      };
      const target = normalize(label);
      const selects = deepQueryAll(document, 'vaadin-select').filter(visible);
      const select = selects.find((candidate) => {
        const shadowLabel = candidate.shadowRoot?.querySelector('[part="label"]')?.textContent;
        const labels = [candidate.label, candidate.getAttribute('label'), shadowLabel, candidate.textContent]
          .filter(Boolean)
          .map(normalize);
        return labels.some((item) => item.includes(target));
      });
      if (!select) return { opened: false, labels: selects.map((candidate) => candidate.label || candidate.getAttribute('label') || candidate.textContent).slice(0, 12) };
      select.click();
      const control = select.shadowRoot?.querySelector('[part="input-field"], button, input');
      if (control) control.click();
      return { opened: true, labels: [] };
    }, { label });
    if (!opened.opened) throw new Error(`Could not open Vaadin select ${label}. Seen labels: ${JSON.stringify(opened.labels)}`);
    await this.waitForIdle(800);
    await this.clickVaadinOverlayOption(optionText);
  }

  async setVaadinSelectOptionByText(optionText) {
    const opened = await this.evaluate(() => {
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const deepQueryAll = (root, selector) => {
        const out = [...root.querySelectorAll(selector)];
        for (const element of root.querySelectorAll('*')) {
          if (element.shadowRoot) out.push(...deepQueryAll(element.shadowRoot, selector));
        }
        return out;
      };
      const selects = deepQueryAll(document, 'vaadin-select').filter(visible);
      const select = selects[selects.length - 1];
      if (!select) return false;
      select.click();
      const control = select.shadowRoot?.querySelector('[part="input-field"], button, input');
      if (control) control.click();
      return true;
    });
    if (!opened) throw new Error('Could not open a visible Vaadin select.');
    await this.waitForIdle(800);
    await this.clickVaadinOverlayOption(optionText);
  }

  async clickVaadinOverlayOption(optionText) {
    let lastOptions = [];
    for (let i = 0; i < 25; i++) {
      const result = await this.evaluate((optionText) => {
        const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const visible = (element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const deepQueryAll = (root, selector) => {
          const out = [...root.querySelectorAll(selector)];
          for (const element of root.querySelectorAll('*')) {
            if (element.shadowRoot) out.push(...deepQueryAll(element.shadowRoot, selector));
          }
          return out;
        };
        const target = normalize(optionText).toLowerCase();
        const items = deepQueryAll(document, 'vaadin-select-item, vaadin-item, [role="option"]')
          .filter(visible)
          .filter((item) => normalize(item.textContent));
        const item = items.find((candidate) => normalize(candidate.textContent).toLowerCase().includes(target));
        if (!item) {
          return { clicked: false, options: items.map((candidate) => normalize(candidate.textContent)).slice(0, 30) };
        }
        item.click();
        return { clicked: true, options: [normalize(item.textContent)] };
      }, optionText);
      if (result.clicked) {
        await this.waitForIdle(1200);
        return;
      }
      lastOptions = result.options || [];
      await this.waitForIdle(300);
    }
    throw new Error(`Could not find Vaadin option ${optionText}. Seen options: ${JSON.stringify(lastOptions)}`);
  }

  async clickDialogButton(text) {
    const target = await this.evaluate((text) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const deepQueryAll = (root, selector) => {
        const out = [...root.querySelectorAll(selector)];
        for (const element of root.querySelectorAll('*')) {
          if (element.shadowRoot) out.push(...deepQueryAll(element.shadowRoot, selector));
        }
        return out;
      };
      const targetText = normalize(text);
      const dialogs = deepQueryAll(document, 'vaadin-dialog-overlay, vaadin-dialog').filter(visible);
      const scope = dialogs[dialogs.length - 1] || document;
      const buttons = deepQueryAll(scope, 'button, vaadin-button').filter(visible);
      const button = buttons.reverse().find((candidate) => normalize(candidate.textContent) === targetText)
        || buttons.find((candidate) => normalize(candidate.textContent).includes(targetText));
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return {
        x: rect.left + (rect.width / 2),
        y: rect.top + (rect.height / 2),
        text: button.textContent,
      };
    }, text);
    if (!target) throw new Error(`Could not find dialog button ${text}`);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });
    await this.waitForIdle(2500);
  }


  async layoutTicTacToeRemoteWindows() {
    const layout = await this.evaluate(() => {
      const titleFor = (frame) => frame.querySelector('.desktop-window-title')?.getAttribute('title')
        || frame.querySelector('.desktop-window-title')?.textContent
        || '';
      const textFor = (frame) => `${titleFor(frame)} ${frame.textContent || ''}`;
      const frames = [...document.querySelectorAll('.desktop-window')];
      const gameFrames = frames.filter((frame) => /Tic-Tac-Toe|tictactoe|NDJSON/i.test(textFor(frame)));
      const human = gameFrames.find((frame) => /\[Human\]|X:\s*HUMAN|O:\s*HUMAN/i.test(textFor(frame)))
        || gameFrames.find((frame) => frame.querySelector('button[aria-label^="Play Tic-Tac-Toe"]'));
      const machine = gameFrames.find((frame) => /Alpha-Beta|Script Core|SCRIPTED|MACHINE/i.test(textFor(frame)) && frame !== human);
      const host = document.querySelector('.desktop-host');
      if (host) {
        host.scrollTo(0, 0);
        host.style.overflow = 'auto';
      }
      window.scrollTo(0, 0);

      const place = (frame, left, top, frameWidth, frameHeight, zIndex) => {
        if (!frame) return false;
        frame.style.display = '';
        frame.style.left = `${left}px`;
        frame.style.top = `${top}px`;
        frame.style.width = `${frameWidth}px`;
        frame.style.height = `${frameHeight}px`;
        frame.style.zIndex = String(zIndex);
        const body = frame.querySelector('.desktop-window-body');
        if (body) {
          body.style.overflow = 'auto';
          body.scrollTop = 0;
          body.scrollLeft = 0;
        }
        return true;
      };

      if (human && machine) {
        place(human, 24, 82, 660, 1040, 9000);
        place(machine, 704, 82, 660, 1040, 8999);
      } else if (human) {
        place(human, 360, 82, 700, 1040, 9000);
      } else if (machine) {
        place(machine, 360, 82, 700, 1040, 9000);
      }

      for (const frame of frames) {
        if (frame !== human && frame !== machine && /Matrix Servers|Text Search|Remote Game Sessions/i.test(titleFor(frame))) {
          frame.style.zIndex = '100';
        }
      }

      return {
        human: human ? titleFor(human) : '',
        machine: machine ? titleFor(machine) : '',
        gameWindowCount: gameFrames.length,
      };
    });
    await this.waitForIdle(1200);
    return layout;
  }

  async ticTacToeHumanState() {
    return this.evaluate(() => {
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const titleFor = (frame) => frame.querySelector('.desktop-window-title')?.getAttribute('title')
        || frame.querySelector('.desktop-window-title')?.textContent
        || '';
      const allFrames = [...document.querySelectorAll('.desktop-window')];
      const visibleFrames = allFrames.filter(visible);
      const frames = visibleFrames.length > 0 ? visibleFrames : allFrames;
      const findFrame = () => frames.find((frame) => /Tic-Tac-Toe/i.test(titleFor(frame) + ' ' + frame.textContent) && /Human/i.test(titleFor(frame) + ' ' + frame.textContent))
        || frames.find((frame) => frame.querySelector('button[aria-label^="Play Tic-Tac-Toe"]'));
      const frame = findFrame();
      if (!frame) {
        return { found: false, title: '', text: '', cells: [], legalMoves: [], canMove: false, terminal: false, humanMark: 'X' };
      }
      const text = frame.innerText || frame.textContent || '';
      const cells = [...frame.querySelectorAll('.ttt-cell')].slice(0, 9).map((cell) => {
        const value = String(cell.textContent || '').replace(/\s+/g, '').trim().toUpperCase();
        if (value.includes('X')) return 'X';
        if (value.includes('O')) return 'O';
        return '';
      });
      const legalMoves = [...frame.querySelectorAll('button[aria-label^="Play Tic-Tac-Toe at row"]')].map((button) => {
        const label = button.getAttribute('aria-label') || '';
        const match = label.match(/row\s+(\d+),\s+column\s+(\d+)/i);
        return match ? { row: Number(match[1]) - 1, col: Number(match[2]) - 1 } : null;
      }).filter(Boolean);
      const humanMark = /X:\s*HUMAN/i.test(text) ? 'X' : (/O:\s*HUMAN/i.test(text) ? 'O' : 'X');
      const winnerMatch = text.match(/Winner:\s*(X|O|DRAW)/i);
      return {
        found: true,
        title: titleFor(frame),
        text: text.replace(/\s+/g, ' ').trim().slice(0, 800),
        cells,
        legalMoves,
        canMove: legalMoves.length > 0,
        terminal: /Match finished/i.test(text) || !!winnerMatch,
        winner: winnerMatch ? winnerMatch[1].toUpperCase() : '',
        humanMark,
      };
    });
  }

  async waitForTicTacToeHumanState(predicate, timeoutMs = 30000) {
    const start = Date.now();
    let last = null;
    while (Date.now() - start < timeoutMs) {
      last = await this.ticTacToeHumanState();
      if (last?.found && predicate(last)) return last;
      await sleep(600);
    }
    throw new Error(`Timed out waiting for Tic-Tac-Toe human board state. Last state: ${JSON.stringify(last)}`);
  }

  async clickTicTacToeHumanCell(row, col) {
    const clicked = await this.evaluate(({ row, col }) => {
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const titleFor = (frame) => frame.querySelector('.desktop-window-title')?.getAttribute('title')
        || frame.querySelector('.desktop-window-title')?.textContent
        || '';
      const frames = [...document.querySelectorAll('.desktop-window')].filter(visible);
      const frame = frames.find((candidate) => /Tic-Tac-Toe/i.test(titleFor(candidate) + ' ' + candidate.textContent) && /Human/i.test(titleFor(candidate) + ' ' + candidate.textContent))
        || frames.find((candidate) => candidate.querySelector('button[aria-label^="Play Tic-Tac-Toe"]'));
      if (!frame) return false;
      const label = `Play Tic-Tac-Toe at row ${row + 1}, column ${col + 1}`;
      const button = [...frame.querySelectorAll('button[aria-label^="Play Tic-Tac-Toe at row"]')]
        .find((candidate) => candidate.getAttribute('aria-label') === label);
      if (!button) return false;
      button.click();
      return true;
    }, { row, col });
    if (!clicked) throw new Error(`Could not click Tic-Tac-Toe human cell ${row},${col}`);
    await this.waitForIdle(1200);
  }

  async setInputByLabel(label, value) {
    const ok = await this.evaluate(({ label, value }) => {
      const normalize = (item) => String(item || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const labels = [...document.querySelectorAll('label')];
      const match = labels.find((candidate) => normalize(candidate.textContent).includes(normalize(label)));
      const field = match?.querySelector('input, textarea, select');
      if (!field) return false;
      const prototype = field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : field instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { label, value });
    if (!ok) throw new Error(`Could not find input for label ${label}`);
    await this.waitForIdle(300);
  }

  async setSelectByLabel(label, value) {
    const ok = await this.evaluate(({ label, value }) => {
      const normalize = (item) => String(item || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const labels = [...document.querySelectorAll('label')];
      const match = labels.find((candidate) => normalize(candidate.textContent).includes(normalize(label)));
      const field = match?.querySelector('select');
      if (!field) return false;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { label, value });
    if (!ok) throw new Error(`Could not find select for label ${label}`);
    await this.waitForIdle(300);
  }

  async setInputByPlaceholder(placeholder, value) {
    const ok = await this.evaluate(({ placeholder, value }) => {
      const normalize = (item) => String(item || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const fields = [...document.querySelectorAll('input, textarea')];
      const field = fields.find((candidate) => normalize(candidate.getAttribute('placeholder')).includes(normalize(placeholder)));
      if (!field) return false;
      const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { placeholder, value });
    if (!ok) throw new Error(`Could not find input with placeholder ${placeholder}`);
    await this.waitForIdle(300);
  }

  async workbenchConnectionState() {
    return this.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        connected: text.includes('Connected to'),
        selectedServer: text.includes('Aletheia server') && !/Selected:\s*none/i.test(text),
      };
    });
  }

  async selectFirstSearchSelectOption(label) {
    const opened = await this.evaluate((label) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const containers = [...document.querySelectorAll('.relative, div')];
      const container = containers.find((candidate) => normalize(candidate.textContent).includes(normalize(label)) && candidate.querySelector('button'));
      const button = container?.querySelector('button');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    }, label);
    if (!opened) return false;
    await this.waitForSelector('#aletheia-searchselect-popover', 30000);
    const selected = await this.evaluate(() => {
      const buttons = [...document.querySelectorAll('#aletheia-searchselect-popover button')];
      const button = buttons.find((candidate) => candidate.textContent.trim());
      if (!button) return false;
      button.click();
      return true;
    });
    await this.waitForIdle(6000);
    return selected;
  }

  async latestJsonResult() {
    return this.evaluate(() => {
      const sections = [...document.querySelectorAll('section')];
      const section = sections.reverse().find((candidate) => candidate.textContent.includes('Last Response'));
      const pre = section?.querySelector('pre');
      if (!pre) return null;
      try {
        return JSON.parse(pre.textContent || 'null');
      } catch {
        return null;
      }
    });
  }

  async waitForJsonResult(predicate, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const json = await this.latestJsonResult();
      if (json && predicate(json)) return json;
      await sleep(500);
    }
    throw new Error('Timed out waiting for JSON result.');
  }

  async tryClickText(selector, text) {
    const clicked = await this.evaluate(({ selector, text }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const items = [...document.querySelectorAll(selector)];
      const item = items.find((candidate) => normalize(candidate.textContent).includes(text));
      if (!item) return false;
      const link = item.tagName === 'A' ? item : item.closest('a');
      if (link?.href) {
        window.location.href = link.href;
        return true;
      }
      item.click();
      return true;
    }, { selector, text });
    if (clicked) await this.waitForIdle(2000);
    return clicked;
  }

  async tryClickModuleAction(moduleName, actionTexts) {
    const result = await this.evaluate(({ moduleName, actionTexts }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const normalizedModuleName = moduleName.toLowerCase();
      const normalizedActions = actionTexts.map((item) => item.toLowerCase());
      const actionElements = [...document.querySelectorAll('a, button')];

      for (const action of actionElements) {
        const actionText = normalize(action.textContent);
        const normalizedActionText = actionText.toLowerCase();
        if (!normalizedActions.some((candidate) => normalizedActionText.includes(candidate))) continue;
        if (action.disabled || action.getAttribute('aria-disabled') === 'true') continue;

        let cursor = action;
        for (let depth = 0; cursor && depth < 8; depth++) {
          if (cursor === document.body || cursor === document.documentElement) break;
          const containerText = normalize(cursor.textContent).toLowerCase();
          if (containerText.includes(normalizedModuleName)) {
            const link = action.tagName === 'A' ? action : action.closest('a');
            if (link?.href) window.location.href = link.href;
            else action.click();
            return { clicked: true, text: actionText || action.getAttribute('aria-label') || action.tagName };
          }
          cursor = cursor.parentElement;
        }
      }

      return { clicked: false, text: '' };
    }, { moduleName, actionTexts });
    if (result.clicked) await this.waitForIdle(2000);
    return result;
  }

  async navigateTextTargetSameTab(selector, text) {
    await this.evaluate(({ selector, text }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const items = [...document.querySelectorAll(selector)];
      const item = items.find((candidate) => normalize(candidate.textContent).includes(text));
      if (!item) throw new Error(`Missing navigation target ${selector} with text ${text}`);

      const link = item.tagName === 'A' ? item : item.closest('a');
      if (link?.href) {
        window.location.href = link.href;
        return;
      }

      const originalOpen = window.open;
      window.open = (url) => {
        if (url) window.location.href = url;
        return window;
      };
      try {
        item.click();
      } finally {
        window.open = originalOpen;
      }
    }, { selector, text });
    await this.waitForIdle(3000);
  }

  async evalForUserRow(email, script) {
    await this.evaluate(({ email, script }) => {
      const rows = [...document.querySelectorAll('tbody tr')];
      const userRow = rows.find((row) => row.textContent.includes(email));
      if (!userRow) throw new Error(`Missing row for ${email}`);
      new Function('userRow', script)(userRow);
    }, { email, script });
  }

  async logout() {
    await this.evaluate(() => {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/logout';
      if (token) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_token';
        input.value = token;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    });
    await this.waitForIdle(2000);
  }

  async screenshot(filename) {
    await this.waitForIdle(500);
    const result = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
    console.log(`Captured ${filename}`);
  }

  async debugState(needle) {
    return this.evaluate((needle) => {
      const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const text = document.body?.innerText || '';
      return {
        url: window.location.href,
        title: document.title,
        containsNeedle: text.includes(needle),
        text: text.replace(emailPattern, '[email]').slice(0, 2000),
      };
    }, needle);
  }
}

async function writeReadme() {
  const lines = [
    '# Aletheia Screenshots',
    '',
    'Sanitized screenshots captured from the public Aletheia portal and a synthetic demo account.',
    '',
    'Files:',
    '',
    ...screenshots.map(([file, description]) => `- \`${file}\` - ${description}`),
    '',
    'These images must not expose proprietary source code, private customer data, credentials, or production secrets.',
    '',
  ];

  await writeFile(path.join(outputDir, 'README.md'), lines.join('\n'));
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

async function resolveAdminCredentials() {
  const credentials = {
    email: process.env.ALETHEIA_ADMIN_EMAIL || "",
    password: process.env.ALETHEIA_ADMIN_PASSWORD || "",
  };

  if (credentials.email && credentials.password) return credentials;
  if (process.env.ALETHEIA_ADMIN_FROM_SEEDER !== "1" && !process.argv.includes("--admin-from-seeder")) return credentials;

  const portalRepo = process.env.ALETHEIA_PORTAL_REPO || "";
  if (!portalRepo) return credentials;
  const seeder = await readFile(path.join(portalRepo, "database/seeders/DatabaseSeeder.php"), "utf8");
  credentials.email ||= matchSeederValue(seeder, "email");
  credentials.password ||= matchSeederValue(seeder, "password");

  return credentials;
}

function matchSeederValue(source, key) {
  const direct = new RegExp(`["']${key}["']\\s*=>\\s*["']([^"']+)["']`);
  const directMatch = source.match(direct)?.[1];
  if (directMatch) return directMatch;

  const wrapped = new RegExp(`["']${key}["']\\s*=>\\s*(?:bcrypt|Hash::make)\\(["']([^"']+)["']`);
  return source.match(wrapped)?.[1] || "";
}
