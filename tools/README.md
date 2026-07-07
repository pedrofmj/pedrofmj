# Tools

This directory contains small portfolio maintenance utilities.

---

## Emulare Screenshot Harness

`EmulareScreenshotHarness.java` renders selected Emulare Swing device emulator frames and a complete connected-device workbench to PNG files.

It is intended for regenerating sanitized screenshots under:

```text
platforms/emulare/screenshots/
```

Run from the repository root:

```bash
xvfb-run -a java \
  -cp /c/development/egt/customers/egt/emulare/emulare/target/emulare-allinone-1.0-jar-with-dependencies.jar \
  tools/EmulareScreenshotHarness.java \
  platforms/emulare/screenshots
```

Requirements:

- Java 21+
- `xvfb-run`
- a built Emulare all-in-one JAR

Do not modify this tool to copy Emulare source code or private repository content into the profile repository.

---

## Aletheia Portal Screenshot Harness

`AletheiaPortalScreenshotHarness.mjs` drives Chromium through the public Aletheia portal and Web UI to capture sanitized PNG screenshots.

It is intended for regenerating screenshots under:

```text
platforms/aletheia/screenshots/
```

Public registration screenshots:

```bash
node tools/AletheiaPortalScreenshotHarness.mjs
```

Full portal flow, when a production-safe admin account is available:

```bash
ALETHEIA_ADMIN_EMAIL=... \
ALETHEIA_ADMIN_PASSWORD=... \
node tools/AletheiaPortalScreenshotHarness.mjs
```

Direct Web UI capture, when a production-safe bearer token is available:

```bash
ALETHEIA_WEB_UI_BEARER_TOKEN=... \
node tools/AletheiaPortalScreenshotHarness.mjs --direct-web-ui-only
```

The direct Web UI mode needs `ALETHEIA_WEB_UI_BEARER_TOKEN` or an explicitly configured private local demo-guide token source. Private-repo helpers require `ALETHEIA_PORTAL_REPO` and must only be used from a trusted local machine. The harness must never write credentials, bearer tokens, private source code, or customer data into this profile repository.

