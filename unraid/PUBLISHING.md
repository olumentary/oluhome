# Publishing Curiolu to Unraid Community Applications

This is a one-time submitter guide. End users installing Curiolu don't need
any of this — they should follow `unraid/README.md` instead.

## Prerequisites

1. **GHCR image is public.** Visit the repo's Packages page → `curiolu` → 
   Package settings → set visibility to Public. CA installs pull anonymously.
2. **At least one tagged release.** CA prefers stable tags. Push a git tag:
   ```sh
   git tag v0.1.0 && git push --tags
   ```
   The GHA workflow at `.github/workflows/docker-publish.yml` will publish
   `ghcr.io/olumentary/curiolu:v0.1.0`, `:0.1`, `:0`, and `:latest`.
3. **Icon.** Provide `unraid/curiolu-icon.png` — a square PNG, ideally 256×256
   (CA accepts up to 512×512). Transparent background works; CA renders it on
   a tile with rounded corners. Commit it alongside the XML so the
   `<Icon>https://raw.githubusercontent.com/olumentary/curiolu/main/unraid/curiolu-icon.png</Icon>`
   reference in `curiolu.xml` resolves.
4. **Sanity-check the XML.** Open `unraid/curiolu.xml` in your browser via the
   raw.githubusercontent URL after pushing — confirm it parses. Then test it
   on your own Unraid box: Apps → search not yet — instead, **Docker tab → Add
   Container → Template** field at the top → paste the raw URL → Apply. This
   round-trips the same XML CA will eventually serve.

## Submission process

CA is a curated store maintained by Andrew Zawadzki ("Squid"). Templates are
pulled from a list of approved authors' GitHub repos. To get on it:

1. **Create a forum post.** Sign in at https://forums.unraid.net and post
   a new thread in the
   **[Community Apps → Application Feedback subforum](https://forums.unraid.net/forum/74-application-feedback/)**
   (or the current "Apps Feedback" equivalent — Unraid occasionally
   reorganizes). The post should include:
   - App name: **Curiolu**
   - One-paragraph description (paste the `<Overview>` from the XML)
   - GitHub repo: https://github.com/olumentary/curiolu
   - Template URL (raw): https://raw.githubusercontent.com/olumentary/curiolu/main/unraid/curiolu.xml
   - Docker image: ghcr.io/olumentary/curiolu
   - Confirm: **public image**, **Apache/MIT/etc. license** (whatever the repo uses)
2. **Tag @Squid in the thread.** That's how he gets notified for review.
3. **Wait.** Approval typically takes a few days to a week. Squid may ask for
   small XML changes (icon size, category fix, missing `<Support>`, etc.).
4. **Once approved**, CA syncs your templates automatically every few hours.
   Users will see "Curiolu" in CA search after the next sync.

Reference for the current process: the pinned thread *"Application
Submission/Reporting"* in the CA Feedback subforum is the canonical entry
point. Squid keeps it updated when the workflow changes.

## Updating an already-listed template

Once you're on the approved list, CA re-pulls your XML on its sync schedule.
**Just commit changes to `unraid/curiolu.xml` on `main`** — no re-submission
needed. Common updates:

- New env var: add a `<Config Type="Variable">` block.
- Bumped image tag: edit `<Repository>`. Most authors leave this on `latest`
  and let users opt into specific tags.
- Better icon: replace `unraid/curiolu-icon.png`.
- Description tweaks: edit `<Overview>` and `<Description>`.

CA users get an "update available" hint when the XML's content changes
materially (image tag bump, new required env var, etc.).

## Self-distribution alternative

You don't *have* to be on the public CA store. Users can install any template
by pasting its raw URL into the Docker tab's Template field on Unraid:

```
https://raw.githubusercontent.com/olumentary/curiolu/main/unraid/curiolu.xml
```

This is a perfectly fine distribution channel — it's how every CA template is
actually loaded under the hood. Use it for:

- Beta-testing template changes before submitting
- Private installs you don't want in the public store
- Sharing with friends without going through approval

## Quick checklist before submitting

- [ ] GHCR image is public
- [ ] At least one semver tag pushed (`v0.1.0` minimum)
- [ ] `unraid/curiolu-icon.png` exists (square PNG, ≥128×128)
- [ ] `<TemplateURL>` and `<Icon>` in the XML resolve over raw.githubusercontent.com
- [ ] Tested on your own Unraid via the "paste URL into Template field" path
- [ ] LICENSE file in the repo root
- [ ] `<Support>` and `<Project>` URLs in the XML work
- [ ] Forum post drafted with all the above
