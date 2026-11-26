# RN Fortis Global Trading website

The site for rnfortisglobal.com. It's built with Vite and vanilla JS, three.js (the live particle layer), GSAP ScrollTrigger and Lenis.

## Run it locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
The finished site is written to `dist/`.

## Cloudflare Pages settings
- Framework preset: None (or Vite)
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (the repository root)
- Node version: 22 (set by `.node-version`)

## Where enquiries go
The site shows inquiries@rnfortisglobal.com and sales@rnfortisglobal.com. The form doesn't send to a server. It checks the fields and opens the visitor's email app with the enquiry addressed to inquiries@rnfortisglobal.com (the `EMAIL` constant in `src/main.js`).

## Media
- `public/film.mp4`: the scroll-scrubbed hero film (H.264, a keyframe every 8 frames). Phones and visitors who prefer reduced motion see `public/img/hero.jpg` instead.
- `public/shipping.mp4`: the looping clip in the shipping section.
