# Jobsy Deploy Skill — CI/CD Files

Source: expo/expo-github-action (official Expo GitHub Action, 1006 ⭐, updated Oct 2025)
Generated: 2026-03-25
Project: Jobsy (com.jobsyja.app)

## Files Included

| File | Purpose | Place In Project |
|------|---------|-----------------|
| `github/workflows/jobsy-ci-cd.yml` | Main CI/CD pipeline: TypeScript audit → EAS Build (iOS+Android) → Vercel deploy → Store submit | `.github/workflows/jobsy-ci-cd.yml` |
| `github/workflows/pr-check.yml` | PR validation: TypeScript + build checks on every PR | `.github/workflows/pr-check.yml` |
| `mobile/eas.json` | EAS Build & Submit configuration | `mobile/eas.json` |
| `mobile/app.config.js` | Dynamic Expo config with EAS project ID | `mobile/app.config.js` |
| `scripts/fix-errors.sh` | Local script: audits and auto-fixes TypeScript/ESLint errors | `scripts/fix-errors.sh` |
| `scripts/build-and-deploy.sh` | Local script: full build + deploy + submit | `scripts/build-and-deploy.sh` |
| `scripts/validate-all.sh` | Pre-flight validation: checks all required files and credentials | `scripts/validate-all.sh` |
| `scripts/templates/eas.json.template` | Fallback EAS config template | `scripts/templates/eas.json.template` |
| `.claude/skills/jobsy-ship.md` | Claude Code skill: autonomous fix → build → deploy → submit | `.claude/skills/jobsy-ship.md` |

## Quick Start

### 1. Add GitHub Secrets
In your GitHub repo → Settings → Secrets and variables → Actions:
- `EXPO_TOKEN` — from https://expo.dev/settings/access-tokens
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `vercel whoami` or Vercel dashboard

### 2. Copy files to your project
Copy everything from this ZIP maintaining the directory structure to:
`C:\Users\Sanique Richards\Downloads\jobsy-main`

### 3. Configure store submission
- **iOS**: Update `mobile/eas.json` with your App Store Connect App ID and Apple Team ID
- **Android**: Add `mobile/service-account.json` (Google Play service account key)

### 4. Run validation
```bash
chmod +x scripts/validate-all.sh
./scripts/validate-all.sh
```

### 5. Trigger the pipeline
Push to main branch or run manually via GitHub Actions → "Jobsy CI/CD"
