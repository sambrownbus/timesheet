# TIMESHEET—01 · deploy notes

## What's in the folder

| file | why it exists |
|---|---|
| `index.html` | the entire app — UI, logic, storage |
| `sw.js` | service worker; caches the shell so it opens with no network |
| `manifest.json` | makes it installable as a standalone app |
| `icon.png`, `icon-512.png` | home screen icon |
| `serve.command` | local testing only, not needed once hosted |
| `icon-options/` | the five icon concepts; not deployed |

Only the first five files need to go up.

---

## Publish to GitHub Pages

From this folder, once:

```bash
cd ~/Desktop/Brown/Coding/Claude/Timesheet
git init -b main
git add index.html sw.js manifest.json icon.png icon-512.png
git commit -m "TIMESHEET-01"
```

Make an empty repo on GitHub called `timesheet` — **public**, and do **not** tick
"Add a README file". Then:

```bash
git remote add origin https://github.com/sambrownbus/timesheet.git
git push -u origin main
```

> Never paste `<angle brackets>` into a terminal. `<` and `>` are redirection
> characters and the shell will error with "No such file or directory".

### The password prompt will not accept your password

GitHub removed password authentication for Git in August 2021. At the `Password:`
prompt you must paste a **Personal Access Token**.

1. Go to <https://github.com/settings/tokens?type=beta> → **Generate new token**
2. Name: `timesheet`. **Expiration: 1 year** (or No expiration, if offered)
3. Repository access → **Only select repositories** → `timesheet`
4. Permissions → Repository permissions → **Contents → Read and write**
5. Generate, then copy the token — it is shown exactly once

Then push again:

- `Username:` → `sambrownbus`
- `Password:` → paste the token

**The terminal shows nothing while you paste a password — no dots, no stars.** That is
normal. Paste once and press Return.

Save it to the Keychain so you're never asked again:

```bash
git config --global credential.helper osxkeychain
```

If the token ever expires, only *publishing updates* breaks. The live site and the copy
installed on your phone keep working regardless.

### Turn on Pages

**Settings → Pages → Source: Deploy from a branch → main / (root) → Save.**

A minute later it's live at `https://sambrownbus.github.io/timesheet/`.

### Publishing a change later

```bash
git add -A && git commit -m "update" && git push
```

### If Pages says "currently being built" but nothing ever appears

Check the repo's **Actions** tab. If it shows GitHub's generic "Automate your workflow"
splash screen, then *no deployment has ever run* — the build isn't slow, it never started.

Almost always this is an **unverified account email**. GitHub requires a verified email
on the account that pushed before it will publish Pages, and it gives no warning on the
Pages screen when this is the blocker.

1. <https://github.com/settings/emails> — look for an **Unverified** label
2. Resend the verification email, open the link (check spam; expires in 24h)
3. Trigger a fresh build:

```bash
git commit --allow-empty -m "trigger pages build"
git push
```

A run named **pages build and deployment** should appear in Actions within seconds.

If the email was already verified: Settings → Pages → Source **None** → Save, then back to
**Deploy from a branch → main → / (root)** → Save.

### If push is rejected

`Updates were rejected because the remote contains work that you do not have locally`
means the repo was created with a README. Merge it in, then push again:

```bash
git pull --rebase origin main
git push -u origin main
```

If you instead get `Invalid username or password` repeatedly, a bad credential is cached.
Clear it and retry:

```bash
git credential-osxkeychain erase
host=github.com
protocol=https
```

(press Return twice after the last line)

If you change `index.html`, bump `CACHE` in `sw.js` (`ts01-v3` → `ts01-v4`) in the same
commit. Without that the old copy can linger for one extra launch.

---

## Install on the iPhone

1. Open the Pages URL **in Safari** (not Chrome — only Safari can install to the Home Screen).
2. Share → **Add to Home Screen** → Add.
3. Open it from the home screen icon, **not** from Safari.

That last point matters. A home-screen app gets its own storage and its own eviction
clock; a Safari tab is subject to the 7-day inactivity rule. Same URL, different rules.

Check the bottom fine print on first launch. It should read `STORAGE PERSISTENT`. That
means the browser has agreed to exempt your data from automatic eviction. If it says
`STORAGE BEST EFFORT` in orange, open it from the home screen icon once more — WebKit
grants persistence partly on the basis of being installed.

### Verifying offline

Turn on Airplane Mode and open the icon. It should load instantly and behave identically.
If it fails, you opened it before the service worker finished installing — open it once
more with a connection, then retry.

---

## Reading the status line

Bottom of the panel. Labels stay grey; **only a value turns orange, and orange means act.**

```
LOG: 0043    JSON EXPORT: 3D    ON DEVICE: STABLE    IDLE
```

| field | meaning | states |
|---|---|---|
| `LOG` | days logged, all time | never coloured |
| `JSON EXPORT` | age of your last manual export file | `TODAY` · `3D` · **`15D`** past 14 days · **`NEVER`** · `—` before anything is logged |
| `ON DEVICE` | whether iOS has agreed not to auto-delete the phone's copy | `STABLE` · **`AT RISK`** |
| lamp | write indicator | `IDLE`, flashes `SAVED 14:22` for 2s after each save |

**`JSON EXPORT` and `ON DEVICE` are two different copies**, which is the whole point of
having both:

- `ON DEVICE` is the live copy on your phone. It's written twice (IndexedDB + localStorage)
  so one store glitching doesn't lose it — but both sit in the same container, so if iOS
  clears that container they go together. `STABLE` means iOS has promised it won't.
- `JSON EXPORT` is a file outside the app entirely. It's the only copy that survives
  deleting the icon, wiping the phone, or replacing it.

`AT RISK` almost always means you're in a Safari tab rather than the installed app. Close
it, open the home screen icon.

## Backups

`BACKUP n D AGO` in the bottom fine print goes orange after 14 days.

**EXPORT** hands the JSON to the iOS share sheet — save it to Files or iCloud Drive.
**IMPORT** merges a file back in; it never deletes days that aren't in the file, so
importing an old backup is always safe.

The export is the only copy that survives deleting the home screen app, wiping the phone,
or clearing website data. Everything else is a convenience.

---

## If it ever breaks

The app is one self-contained HTML file with no dependencies, no build step, and no
network calls. Opening `index.html` directly in any desktop browser works and always will.
Your data is a plain JSON map of dates to minutes-past-midnight:

```json
{ "days": { "2026-07-27": { "in": 540, "out": 1050 } } }
```

`540` is 09:00, `1050` is 17:30. Readable and re-importable by anything, forever.
