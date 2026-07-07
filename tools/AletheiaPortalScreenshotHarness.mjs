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

const screenshots = [
  ['01-public-soon.png', 'Public release page'],
  ['02-register-request-access.png', 'Portal access request form'],
  ['03-register-submitted.png', 'Access request submitted'],
  ['04-dashboard.png', 'Approved user dashboard'],
  ['05-marketplace.png', 'Aletheia marketplace'],
  ['06-applications-installed.png', 'Installed applications'],
  ['07-aletheia-launcher.png', 'Aletheia launch center'],
  ['08-aletheia-web-ui-login.png', 'Aletheia web workbench login'],
  ['09-aletheia-web-ui-workbench.png', 'Aletheia web workbench'],
  ['10-aletheia-matrix-servers.png', 'Matrix servers workspace'],
  ['11-aletheia-text-search.png', 'Text search workspace'],
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

    await capturePublicAndRegistration(page);

    if (!admin.email || !admin.password) {
      console.log('Admin credentials were not provided. Captured public and registration screenshots only.');
      return;
    }

    await approveAndGrant(page);
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
  await page.waitForText('Dashboard', 30000);
  await page.screenshot('04-dashboard.png');

  await page.goto(`${portalUrl}/modules/store`);
  await page.waitForText('Marketplace', 30000);
  await page.screenshot('05-marketplace.png');

  await page.goto(`${portalUrl}/modules`);
  await page.waitForText('Applications', 30000);
  await page.screenshot('06-applications-installed.png');

  await page.goto(`${portalUrl}/app/aletheia`);
  await page.waitForText('Aletheia Applications', 45000);
  await page.waitForText('Provisioned', 90000);
  await page.screenshot('07-aletheia-launcher.png');

  await page.clickText('a', 'Open Console');
  await page.waitForUrl((url) => url.startsWith(uiUrl), 45000);
  await page.waitForIdle(5000);
  await page.screenshot('08-aletheia-web-ui.png');
}

async function login(page, email, password) {
  await page.goto(`${portalUrl}/login`);
  await page.waitForSelector('input#email', 20000);
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.clickText('button', 'Sign in');
  await page.waitForIdle(2500);
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
    await this.waitFor(() => predicate(window.location.href), timeoutMs);
  }

  async waitForSelector(selector, timeoutMs = 30000) {
    await this.waitFor((sel) => !!document.querySelector(sel), timeoutMs, selector);
  }

  async waitForText(text, timeoutMs = 30000) {
    await this.waitFor((needle) => document.body?.innerText.includes(needle), timeoutMs, text);
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
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area')];
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
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area')];
      const normalized = label.toLowerCase();
      const field = fields.find((candidate) => {
        const labels = [candidate.label, candidate.getAttribute('label'), candidate.textContent]
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
      for (const field of document.querySelectorAll('vaadin-text-field, vaadin-password-field')) {
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
      const fields = [...document.querySelectorAll('vaadin-text-field, vaadin-password-field, vaadin-text-area')];
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

  async clickText(selector, text) {
    await this.evaluate(({ selector, text }) => {
      const items = [...document.querySelectorAll(selector)];
      const item = items.find((candidate) => candidate.textContent.replace(/\s+/g, ' ').trim().includes(text));
      if (!item) throw new Error(`Missing clickable ${selector} with text ${text}`);
      item.click();
    }, { selector, text });
    await this.waitForIdle(2000);
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
