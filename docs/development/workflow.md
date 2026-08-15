# Development Workflow

This document defines the Git branch and pull request workflow for the `pedrofmj` repository, following the [EgypTeam Branch and PR Workflow pattern](https://github.com/egypteam/egypteam-patterns/tree/main/patterns/process/git/branch-and-pr-workflow).

## Pattern Reference

- **Pattern ID:** `process/git/branch-and-pr-workflow`
- **Version:** `0.1.0`
- **Status:** `adopted`
- **Adopted:** 2026-08-15

## Branch Prefixes

| Prefix | Purpose | Deploys? | Example |
|--------|---------|----------|---------|
| `feature/` | New features, enhancements | ✅ | `feature/add-repo-inventory` |
| `fix/` | Bug fixes, corrections | ✅ | `fix/csv-encoding` |
| `doc/` | Documentation only | ❌ | `doc/update-contributing` |
| `mute/` | Refactor, chore, experiment | ❌ | `mute/refactor-csv-gen` |

## Rules

1. **No direct commits to `main`.** Every change arrives via a merged PR.
2. **Branch names:** `<prefix>/<kebab-case-description>`. Keep concise.
3. **PR required:** Title = `type(scope): description` (conventional commits). Describe *why*, not just *what*.
4. **Approval:** At least one review (self-approval OK for solo work). Squash merge. Delete branch after.
5. **Rebase:** Update from `main` before requesting review.
6. **Secrets:** Never commit credentials, tokens, or private data.

## PR Title Format (Conventional Commits)

```
<type>(<scope>): <description>

Examples:
feat(docs): add development workflow documentation
fix(profile): correct platform links in README
doc(readme): update contact information
mute(structure): reorganize docs/development folder
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code restructuring without behavior change
- `chore` - Maintenance tasks
- `test` - Adding or modifying tests
- `ci` - CI/CD changes

## PR Template

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief explanation of **why** this change is needed (not just what).

## Type
- [ ] feature/
- [ ] fix/
- [ ] doc/
- [ ] mute/

## Checklist
- [ ] Branch targets `main`
- [ ] Title follows `type(scope): description`
- [ ] Changes are self-contained (single logical change)
- [ ] No secrets/credentials committed
- [ ] Tested locally (if feature/* or fix/*)
- [ ] No deployment impact (if doc/* or mute/*)
- [ ] Rebased onto latest `main`

## Related
- Issues: #
- ADRs: 
```

## Local Git Hooks (Recommended)

Hook templates are versioned under `.githooks/`. Enable them locally with:

```bash
git config core.hooksPath .githooks
```

### commit-msg hook
Enforce conventional commit format:
```bash
#!/bin/bash
MSG=$(cat "$1")
if ! echo "$MSG" | head -1 | grep -qE '^(feat|fix|docs|refactor|chore|test|ci)(\(.+\))?: .+'; then
  echo "ERROR: Commit message must follow conventional format: type(scope): subject"
  echo "Example: feat(inventory): add tracker flag"
  exit 1
fi
```

### pre-push hook
Validate branch prefix:
```bash
#!/bin/bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" && ! "$BRANCH" =~ ^(feature|fix|doc|mute)/ ]]; then
  echo "ERROR: Branch '$BRANCH' must start with feature/, fix/, doc/, or mute/"
  exit 1
fi
```

## Pipeline Implementation

The repository includes `.github/workflows/pr-pipeline.yml` for branch, content, and secret validation. It also includes `.github/workflows/deployment-pipeline.yml`; because this is a documentation portfolio with no hosting target, that workflow verifies deployment impact and stops at a staging placeholder.

### PR Pipeline (on PR creation/update)
- Lint → Test → Validate (secrets, branch naming) → Report

### Deployment Pipeline (on `feature/*` or `fix/*` merge to `main`)
- Build → Full Test → Deploy Staging → Tag Release → Update Registry

`doc/*` and `mute/*` merges skip deployment.

## Verification Checklist

After setup:
- [ ] Cannot push directly to `main` (GitHub branch protection setting)
- [x] PR from `feature/xyz` runs PR pipeline
- [x] PR from `doc/xyz` skips deployment pipeline
- [x] Merge of `feature/xyz` triggers deployment pipeline check
- [x] Branch prefix validation rejects invalid names
- [x] Secret scanning is configured for same-repository PRs
- [ ] Squash merge produces clean linear history (GitHub branch protection setting)
- [x] PR template is installed
- [x] CODEOWNERS is installed
- [x] Local hook templates are installed
- [x] Semantic-release configuration is installed

## Adoption Log

| Date | Action | Commit |
|------|--------|--------|
| 2026-08-15 | Initial adoption | (this PR) |

## References

- Pattern: `process/git/branch-and-pr-workflow` (EgypTeam Patterns)
- Implementation Guide: [implementation.md](https://github.com/egypteam/egypteam-patterns/blob/main/patterns/process/git/branch-and-pr-workflow/implementation.md)
- GitHub Branch Protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets
- GitHub Actions: https://docs.github.com/en/actions
