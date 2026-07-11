# Software Platforms

This area documents software platforms as long-term engineering assets.

The goal is to explain what each platform is, why it exists, what business problem it addresses, and how it can generate future research without exposing proprietary source code or sensitive implementation details.

Local platform repositories may be used as private reference material, but this portfolio must never expose private source code, repository links, local filesystem paths, credentials, customer data, or internal deployment details.

---

## Platform Index

| Platform | Status | Focus | Documentation |
| --- | --- | --- | --- |
| Aletheia | Active / research-oriented | Agent environments, cognitive modeling, scripting, and AI-assisted reasoning | [Open](aletheia/) |
| Emulare | Active / maintained | Hardware and device emulation for testing and integration | [Open](emulare/) |
| EgypTeam Via | Active / commercial platform | Commercial workflows, dynamic sales-cart lifecycle, and payment-state consistency | [Open](egyptteam-via/) |
| EgypTeam POS | Active / professional platform | Professional operating system for clients, opportunities, documents, invoices, and AI-assisted workflows | [Open](egyptteam-pos/) |
| CDM | Active / applied platform | Water measurement collection, batch synchronization, evidence, and reporting | [Open](cdm/) |
| Echora | Active / evolving platform | DAW workspace, MIDI devices, audio playback, routing, and cross-surface music production | [Open](echora/) |

---

## Public Websites

| Platform | Product site | EgypTeam research page |
| --- | --- | --- |
| Aletheia | [aletheia.egypteam.com](https://aletheia.egypteam.com/) | [egypteam.com/research/aletheia](https://egypteam.com/research/aletheia) |
| CDM | [cdm.egypteam.com](https://cdm.egypteam.com/) | [egypteam.com/research/cdm](https://egypteam.com/research/cdm) |

---

## Documentation Model

Each platform page follows the same structure:

- Platform status
- Purpose
- Motivation
- Business problem
- Architecture overview
- Sanitized architecture diagram
- Technologies
- Engineering decisions
- Usage scenario
- Technical challenge
- Engineering lesson learned
- Platform relationships
- Screenshots and visual assets
- Future roadmap
- Related research
- Research opportunities

This keeps the section scalable as more platforms are added over time. Use [TEMPLATE.md](TEMPLATE.md) when adding another platform.

---

## Public Documentation Boundary

These pages are intentionally high-level.

They do not include:

- proprietary source code
- customer data
- credentials or infrastructure details
- private business rules
- implementation details that would expose internal systems

They are written as professional portfolio documentation, architecture summaries, and starting points for future research.

---

## Naming Conventions

- Use lowercase `kebab-case` folder names.
- Keep folder names stable once published.
- Use the public product name as the page title.
- Keep screenshots under each platform-specific `screenshots/` directory unless an asset is shared across platforms.
- Avoid customer names, private repository names, private infrastructure names, and internal environment names in folder or file names.

---

## Platform Relationships

- Aletheia can inform AI-assisted reasoning, knowledge retrieval, and evaluation patterns for future platform research.
- Emulare can support commercial-device workflow testing for EgypTeam Via and other integration-heavy systems.
- EgypTeam Via can generate research around commercial transaction state, payment composition, and sale lifecycle validation.
- EgypTeam POS can generate research around personal professional knowledge systems and AI-assisted document workflows.
- CDM can generate research around field measurement quality, evidence-backed validation, and offline synchronization.
- Echora can contribute audio-device, live-performance, and cross-surface workspace research.
