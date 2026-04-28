# My BeachLife 2026 — Schedule Builder

A no-backend, mobile-first web app for curating your personal schedule across the BeachLife Festival 2026 lineup (May 1–3, Redondo Beach).

**Live:** https://clint-burum.github.io/beachlife-2026-scheduler/

## What it does

- Browse the full lineup organized by stage (HighTide, LowTide, SpeakEasy, RipTide) and day
- Tap any act to add it to your schedule; tap again to remove
- See conflicts highlighted automatically when you pick overlapping sets across stages
- Preview any act on Apple Music or Spotify with one tap (icons on every artist card)
- Expand the official set-times poster at the bottom of each day for cross-reference
- Hit **Share** — your schedule is encoded into the URL itself, so the link you copy *is* your schedule
- Friends open the link, see your picks, and can fork by tapping different acts
- Add to your iPhone home screen for an app-like experience (custom icon, full-screen launch)

No accounts, no backend, no tracking. Just a static HTML/CSS/JS app deployed to GitHub Pages.

## How sharing works

Selections are serialized into the URL hash:

```
https://clint-burum.github.io/beachlife-2026-scheduler/#fri=duranduran,grouplove&sat=theoffspring,switchfoot&sun=jamestaylor,sherylcrow
```

Send that link, the recipient sees your picks. They tap to add/remove from their own version, and the URL updates live as they go — they can copy their version and send it back.

## Music preview links

Each artist card has Apple Music and Spotify icons. Tapping either opens that service's app on iOS (or web on desktop) with the artist loaded.

**Apple Music behavior:** the app uses the public iTunes Search API to resolve each artist to their Apple Music artist page on first tap, then caches the result in `localStorage` for instant subsequent taps. This works around the iOS Apple Music app's habit of dropping `?term=` query params on universal-link handoffs.

**Known minor annoyance:** because of how iOS handles the Apple → app handoff, tapping an Apple Music icon leaves an empty Safari tab behind that you'll need to close manually. Workarounds for this introduced more complexity than they were worth (`window.close()` is blocked on iOS Safari for user-opened windows; navigating the current tab risks losing the user's schedule on rare devices without the Apple Music app). Living with it for now. Spotify links don't have this problem.

## Files

- `index.html` — single page, all meta tags for iOS home-screen install
- `style.css` — distinctive beach festival aesthetic, mobile first
- `app.js` — vanilla JS, no framework, no build step
- `lineup.json` — set times transcribed from official BeachLife posters on 2026-04-27
- `manifest.webmanifest` — PWA manifest for Android/Chrome home-screen install
- `assets/setlist-{fri,sat,sun}.jpg` — official set-times posters from beachlifefestival.com
- `icons/` — favicon and apple-touch-icon set
- `.github/workflows/deploy.yml` — auto-deploy to Pages on push to main

## Updating set times

If the festival publishes corrections, edit `lineup.json` and push. GitHub Actions redeploys in ~30 seconds.

## Disclaimer

Not affiliated with BeachLife Festival. Set times are subject to change — verify against the official festival app on the day of.

