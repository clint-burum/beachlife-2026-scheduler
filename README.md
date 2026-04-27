# My BeachLife 2026 — Schedule Builder

A no-backend, mobile-first web app for curating your personal schedule across the BeachLife Festival 2026 lineup (May 1–3, Redondo Beach).

**Live:** https://clint-burum.github.io/beachlife-2026-scheduler/

## What it does

- Browse the full lineup organized by stage (HighTide, LowTide, SpeakEasy, RipTide) and day
- Tap any act to add it to your schedule; tap again to remove
- See conflicts highlighted automatically when you pick overlapping sets across stages
- Hit **Share** — your schedule is encoded into the URL itself, so the link you copy *is* your schedule
- Friends open the link, see your picks, and can fork by tapping different acts

No accounts, no backend, no tracking. Just a static HTML/CSS/JS app deployed to GitHub Pages.

## How sharing works

Selections are serialized into the URL hash:

```
https://clint-burum.github.io/beachlife-2026-scheduler/#fri=duranduran,grouplove&sat=theoffspring,switchfoot&sun=jamestaylor,sherylcrow
```

Send that link, the recipient sees your picks. They tap to add/remove from their own version, and the URL updates live as they go — they can copy their version and send it back.

## Files

- `index.html` — single page
- `style.css` — distinctive beach festival aesthetic, mobile first
- `app.js` — vanilla JS, no framework, no build step
- `lineup.json` — set times transcribed from official BeachLife posters on 2026-04-27
- `.github/workflows/deploy.yml` — auto-deploy to Pages on push to main

## Updating set times

If the festival publishes corrections, edit `lineup.json` and push. GitHub Actions redeploys in ~30 seconds.

## Disclaimer

Not affiliated with BeachLife Festival. Set times are subject to change — verify against the official festival app on the day of.
