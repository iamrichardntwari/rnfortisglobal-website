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

## Hosting on Cloudflare
The site is a Cloudflare Worker that serves static assets. `wrangler.jsonc` points it at `./dist` and attaches rnfortisglobal.com and www.rnfortisglobal.com as custom domains.
- Deploy by hand: `npm run build && npx wrangler deploy`
- Git-connected builds: build command `npm run build`, deploy command `npx wrangler deploy`.
- Node version: 22 (set by `.node-version`).

## Where enquiries go
The site shows info@rnfortisglobal.com and sales@rnfortisglobal.com. The form sends enquiries to info@rnfortisglobal.com through Web3Forms (the `WEB3FORMS_KEY` constant in `src/main.js`; the key is public by design and only sends to that inbox). If sending fails, it opens the visitor's email app instead.

## Media
- `public/film.mp4`: the scroll-scrubbed hero film (H.264, a keyframe every 8 frames). Phones and visitors who prefer reduced motion see `public/img/hero.jpg` instead.
- `public/shipping.mp4`: the looping clip in the shipping section.
