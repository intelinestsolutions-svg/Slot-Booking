# Deploy & Release

How to ship a new version of the **Sabah Buskers Community** app/web to
`apps.sabahbuskers.my`. Deployment is automatic: a push to `main` triggers the
`Auto Deploy to SBC Hosting` GitHub Actions workflow, which uploads the app via
FTP to the apps subdomain.

## Release checklist (every release)

1. Bump the web build version — `assets/js/config.js`
   - `webBuild` (e.g. `20261026` → `20261027`)
   - `buildCode` (e.g. `5` → `6`)
   - `buildName` (e.g. `1.3-beta` → `1.4-beta`)
2. Bump the Android versions — `android/app/build.gradle`
   - `versionCode` (must match `buildCode` in step 1)
   - `versionName` (must match `buildName` in step 1)
3. Bump the manifest — `version.json` (this is what the in-app update checker reads)
   - must always be **greater** than the newest installed build
   - update `android.version` / `android.versionCode` and optionally `notes`
4. Rebuild the APK:
   `JAVA_HOME="$(/usr/libexec/java_home)" android/gradlew -p android assembleDebug`
   then `cp android/app/build/outputs/apk/debug/app-debug.apk sbc-mobile.apk`
5. Commit and push:
   `git push origin main`

The workflow builds `deploy-package/` and uploads `index.html`, `assets/`,
`api/`, `version.json`, `.htaccess`, and `sbc-mobile.apk` to
`apps.sabahbuskers.my` (`server-dir: /public_html/` — the apps subdomain's
docroot inside the hosting account; FTP incremental, nothing is deleted).

## Verify the deploy

- Manifest: `https://apps.sabahbuskers.my/version.json`
- APK: `https://apps.sabahbuskers.my/sbc-mobile.apk`
- Updater script loads: `https://apps.sabahbuskers.my/assets/js/update.js`

Old Android APKs (older `versionCode`) will prompt "Versi Baharu Tersedia" with a
**Muat Turun** button pointing at the APK URL.

## GitHub-side setup

- Secrets (repo → Settings → Secrets and variables → Actions):
  - `HOSTINGER_HOST` = `145.79.26.229`
  - `HOSTINGER_PORT` = `21`
  - `HOSTINGER_USERNAME` = `u382882503.apps.sabahbuskers.my`
  - `HOSTINGER_PASSWORD` = FTP password (masked)
  - `TOYYIBPAY_MODE` = `live` (or `sandbox` for testing)
  - `TOYYIBPAY_USER_SECRET_KEY` = your ToyyibPay user secret key
  - `TOYYIBPAY_CATEGORY_CODE` = your category code (e.g. `9d3qxmne`)
  - `VERIFY_TOKEN` = app verify token (must match `VERIFY_TOKEN` in local config)
  - `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` = default admin login
  - `WHATSAPP_GATEWAY` = `ultramsg` | `chatapi` | empty to disable
  - `WHATSAPP_INSTANCE_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_TO` = WhatsApp alert config
  - The deploy workflow writes `api/config.local.php` from these secrets before
    uploading, so the live keys never need to live in git.
- Workflow file: `.github/workflows/deploy.yml`
- The pushing token needs **Contents** and **Workflows** permissions
  (Read and write).

## Notes

- This pipeline targets **only** `apps.sabahbuskers.my`. The main-domain static
  site (`sabahbuskers.my`) is managed separately and is **not** touched by this
  workflow.
- Native Android footer/offline assets are regenerated locally from the web app
  (`assets/`) before each APK build; they do not need separate deployment.
- If the update prompt does not appear after a release, the installed APK's
  `versionCode` is not lower than `version.json`'s, or the daily "Nanti"
  suppression is active (24h).