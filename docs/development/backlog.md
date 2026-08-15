# Development Backlog

This backlog tracks all work items for the `pedrofmj` repository: retroactive (completed), present (in progress), and future (planned).

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Completed and merged |
| 🔄 In Progress | Currently being worked on |
| ⏳ Planned | Planned for future |
| 💡 Idea | Not yet prioritized |

---

## Retroactive (Completed)

These items were completed before formal backlog tracking was established.

| ID | Title | Type | Status | Related Commit | Notes |
|----|-------|------|--------|----------------|-------|
| RETRO-01 | Initial repository setup | chore | ✅ Done | 181ffa1 | Created repository with basic structure |
| RETRO-02 | Add comprehensive README with personal info | docs | ✅ Done | 3f1b415 | Detailed profile, skills, platforms, research |
| RETRO-03 | Add platform documentation structure | docs | ✅ Done | 749d833 | Created platforms/ folder with README |
| RETRO-04 | Add platform completion checklist | docs | ✅ Done | 3c0fa02 | Checklist for platform docs completeness |
| RETRO-05 | Refine public-safe platform documentation | docs | ✅ Done | 3ffee1e | Removed proprietary details |
| RETRO-06 | Refresh platform docs and remove TCC | docs | ✅ Done | cb7ecac | Updated platform status |
| RETRO-07 | Document platform status and research lines | docs | ✅ Done | b894d55 | Added research lines index |
| RETRO-08 | Add sanitized Emulare screenshots | docs | ✅ Done | abd7faa | Device emulator screenshots |
| RETRO-09 | Add complete Emulare workbench screenshot | docs | ✅ Done | cd8da82 | Full workbench view |
| RETRO-10 | Add Aletheia screenshot harness and images | docs | ✅ Done | 60f9cd1 | Test harness + screenshots |
| RETRO-11 | Add Aletheia Tic-Tac-Toe flow captures | docs | ✅ Done | 7cab4d5 | Game flow screenshots |
| RETRO-12 | Refine Aletheia Tic-Tac-Toe screenshots | docs | ✅ Done | 1c1b56c | Improved visual quality |
| RETRO-13 | Expand README screenshots into inline gallery | docs | ✅ Done | 8f7c0cc | Gallery format in README |
| RETRO-14 | Add synthetic head demo screenshots | docs | ✅ Done | 4b40cdf | AI avatar expressions |
| RETRO-15 | Add GitHub stats badge to README | docs | ✅ Done | fa13578 | Dynamic stats badge |
| RETRO-16 | Remove GitHub stats badge from README | docs | ✅ Done | 125c376 | Cleaned up README |
| RETRO-17 | Add Echora platform documentation | docs | ✅ Done | 6d48d8a | Full platform docs with screenshots |
| RETRO-18 | Add Echora platform documentation link | docs | ✅ Done | 9a544ad | Linked from main README |

---

## Present (In Progress)

| ID | Title | Type | Status | Branch | Description |
|----|-------|------|--------|--------|-------------|
| CUR-01 | Create docs/development structure | feat | 🔄 In Progress | feature/docs-development-structure | Create workflow.md, backlog.md, tracker.md following EgypTeam patterns |
| CUR-02 | Adopt branch-and-pr-workflow pattern | process | 🔄 In Progress | feature/docs-development-structure | Apply EgypTeam Git workflow pattern to this repo |

---

## Future (Planned)

### Short Term (Next 1-2 Sprints)

| ID | Title | Type | Priority | Description |
|----|-------|------|----------|-------------|
| FUT-01 | Add GitHub branch protection rules | ci | High | Protect main branch, require PR reviews |
| FUT-02 | Add PR pipeline GitHub Action | ci | High | Lint, test, validate on PR |
| FUT-03 | Add deployment pipeline GitHub Action | ci | Medium | Build, test, deploy on feature/fix merge |
| FUT-04 | Add PR template | docs | High | Standardized PR description |
| FUT-05 | Add local git hooks (commit-msg, pre-push) | chore | Medium | Enforce conventions locally |
| FUT-06 | Add CODEOWNERS file | docs | Low | Define review ownership |
| FUT-07 | Configure semantic release | ci | Low | Automatic versioning from PR titles |

### Medium Term (Next Quarter)

| ID | Title | Type | Priority | Description |
|----|-------|------|----------|-------------|
| FUT-08 | Add platform documentation for Aurum | docs | ✅ Done | Added `platforms/aurum/` and linked it from both platform indexes |
| FUT-09 | Add platform documentation for Galaxy | docs | 🔄 In Progress | Create platforms/galaxy/ with architecture |
| FUT-10 | Add platform documentation for EgypTeam Atlas | docs | 🔄 In Progress | Create platforms/egypteam-atlas/ |
| FUT-11 | Add platform documentation for EgypTeam Invoicing | docs | 🔄 In Progress | Create platforms/egyptteam-invoicing/ |
| FUT-12 | Add platform documentation for EgypTeam ADM | docs | 🔄 In Progress | Create platforms/egypteam-adm/ |
| FUT-13 | Add research papers section content | docs | Medium | Populate research/papers/ with actual papers |
| FUT-14 | Add technical reports content | docs | 🔄 In Progress | Added the initial cross-platform architecture and research map |
| FUT-15 | Add whitepapers content | docs | Medium | Populate research/whitepapers/ |

### Long Term (Future)

| ID | Title | Type | Priority | Description |
|----|-------|------|----------|-------------|
| FUT-16 | Create interactive platform architecture diagrams | feat | Low | Mermaid.js or similar diagrams |
| FUT-17 | Add automated screenshot validation | test | Low | CI check for screenshot freshness |
| FUT-18 | Add multilingual support (PT/EN) | feat | Low | Translate key documentation |
| FUT-19 | Add search/index for platform docs | feat | Low | Algolia or similar |
| FUT-20 | Create project dashboard / portfolio site | feat | Low | Static site from this repo |

---

## Research & Exploration (Ideas)

| ID | Title | Type | Description |
|----|-------|------|-------------|
| RES-01 | Document Aletheia cognitive architecture patterns | research | Extract patterns from Aletheia platform |
| RES-02 | Document Emulare device protocol specifications | research | Protocol docs for emulated devices |
| RES-03 | Document Echora audio engine architecture | research | Audio routing, MIDI, VST hosting |
| RES-04 | Document CDM water measurement data models | research | Batch sync, evidence, reporting |
| RES-05 | Document EgypTeam POS workflow engine | research | Dynamic cart, payment state consistency |

| RES-06 | Define cross-platform traceability dataset | research | Synthetic cases for context, evidence, review, and recovery experiments |

---

## Backlog Maintenance

- **Review cadence:** Weekly (Monday)
- **Sprint planning:** Every 2 weeks
- **Retrospective:** End of each sprint
- **Backlog grooming:** Ongoing, as items are clarified

### Adding New Items

1. Create issue in GitHub (if applicable)
2. Add row to appropriate section above
3. Assign ID (next sequential in section)
4. Define type, priority, description
5. Link to related issues/PRs

### Updating Status

- Move items between sections as they progress
- Update status column
- Add commit/PR references when done
- Archive completed items to Retroactive after sprint review

---

## Related Documents

- [Workflow](workflow.md) - Git branch and PR workflow
- [Tracker](tracker.md) - Checklist-based progress tracker
- [EgypTeam Branch & PR Pattern](https://github.com/egypteam/egypteam-patterns/tree/main/patterns/process/git/branch-and-pr-workflow)
