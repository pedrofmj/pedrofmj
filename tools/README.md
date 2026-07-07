# Tools

This directory contains small portfolio maintenance utilities.

---

## Emulare Screenshot Harness

`EmulareScreenshotHarness.java` renders selected Emulare Swing device emulator frames to PNG files.

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

