// RN Fortis: smooth scroll, the scroll-scrubbed hero film, live atmosphere, reveals and the enquiry form.
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

// ---------- header: solid once the story is under way, phone menu ----------
const top = document.querySelector(".top");
const menu = document.getElementById("menu");
ScrollTrigger.create({ start: () => innerHeight * 0.6, onToggle: (s) => top.classList.toggle("is-solid", s.isActive) });
const setMenu = (open) => { top.classList.toggle("is-open", open); menu.setAttribute("aria-expanded", String(open)); menu.textContent = open ? "Close" : "Menu"; };
menu.addEventListener("click", () => setMenu(!top.classList.contains("is-open")));
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const id = a.getAttribute("href");
  const el = id === "#top" ? document.body : document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  setMenu(false);
  lenis.scrollTo(el, { offset: id === "#top" ? 0 : -72 });
}));

// ---------- the hero film, scrubbed across the story ----------
const bgVideo = document.getElementById("bgv");
const STATIC_HERO = matchMedia("(prefers-reduced-motion: reduce)");
const PHONE = matchMedia("(max-width: 768px), (hover: none)").matches;
const story = document.getElementById("story");
let seekBusy = false, pendingTime = null, lastVideoT = -1;
function requestSeek(t) {
  if (!bgVideo.duration) return;
  if (Math.abs(t - lastVideoT) < 0.008) return;
  if (seekBusy) { pendingTime = t; return; }
  seekBusy = true; lastVideoT = t; bgVideo.currentTime = t;
}
bgVideo.addEventListener("seeked", () => {
  seekBusy = false;
  if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
});
bgVideo.addEventListener("error", () => { seekBusy = false; pendingTime = null; document.body.classList.add("video-failed"); });
function storyProgress() {
  const end = story.offsetTop + story.offsetHeight - innerHeight;
  return gsap.utils.clamp(0, 1, window.scrollY / Math.max(1, end));
}
// The middle of the film moves fastest, so give it more scroll: ease in-out over the story.
const shape = (p) => (p < 0.5 ? 0.5 * Math.pow(p * 2, 0.8) : 1 - 0.5 * Math.pow((1 - p) * 2, 0.8));
function scrubVideo() { requestSeek(shape(storyProgress()) * (bgVideo.duration - 0.05)); }
async function initVideo() {
  if (STATIC_HERO.matches) return;
  try {
    const res = await fetch("/film.mp4");
    if (!res.ok) throw new Error(res.status);
    bgVideo.src = URL.createObjectURL(await res.blob());
    bgVideo.load();
    bgVideo.addEventListener("loadedmetadata", () => {
      lastVideoT = -1; scrubVideo();
      document.body.classList.add("video-ready");
    }, { once: true });
    lenis.on("scroll", scrubVideo);
  } catch { document.body.classList.add("video-failed"); }
}

// Phones: iPhones won't reliably seek a paused video (Low Power Mode blocks it outright),
// so they get the same film as 169 vertical frames drawn on a canvas as you scroll.
const FRAMES = 169;
function initFrames() {
  if (STATIC_HERO.matches) return;
  const cv = document.getElementById("seq"), ctx = cv.getContext("2d");
  const imgs = new Array(FRAMES).fill(null);
  let shownImg = null, queued = false;
  const pick = (i) => {
    for (let k = 0; k < FRAMES; k++) {
      if (imgs[i - k]?.ok) return imgs[i - k];
      if (imgs[i + k]?.ok) return imgs[i + k];
    }
    return null;
  };
  function draw() {
    queued = false;
    const img = pick(Math.round(shape(storyProgress()) * (FRAMES - 1)));
    if (!img || img === shownImg) return;
    shownImg = img;
    const s = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
    shownImg = null; schedule();
  };
  // Load the first frame, then a coarse pass across the film, then fill in, so scrubbing works early.
  const order = [0];
  for (const step of [24, 8, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!order.includes(i)) order.push(i);
  let next = 0;
  const loadOne = () => {
    if (next >= order.length) return;
    const i = order[next++], img = new Image();
    img.decoding = "async";
    img.onload = () => {
      img.ok = true; imgs[i] = img;
      if (i === 0) document.body.classList.add("seq", "video-ready");
      schedule(); loadOne();
    };
    img.onerror = loadOne;
    img.src = `/frames/f${String(i + 1).padStart(3, "0")}.webp`;
  };
  for (let n = 0; n < 6; n++) loadOne();
  size();
  addEventListener("resize", size);
  addEventListener("scroll", schedule, { passive: true });
  lenis.on("scroll", schedule);
}
PHONE ? initFrames() : initVideo();


// ---------- after the story, the resting frame dims behind the sections ----------
gsap.to(".stage-dim", { opacity: 0.8, ease: "none",
  scrollTrigger: { trigger: "#story", start: "bottom 95%", end: "bottom 35%", scrub: true } });

// ---------- live atmosphere over the film ----------
import("./atmosphere.js").then(({ initAtmosphere }) => initAtmosphere({ lenis }));

// ---------- beat copy fades between beats; sections rise in ----------
if (!REDUCED) {
  document.querySelectorAll(".beat").forEach((b, i) => {
    if (i === 0) {
      gsap.to(b, { opacity: 0, y: -40, ease: "none", scrollTrigger: { trigger: b, start: "top -35%", end: "bottom 10%", scrub: true } });
      return;
    }
    gsap.timeline({ scrollTrigger: { trigger: b, start: "top 85%", end: "bottom 15%", scrub: true } })
      .fromTo(b, { opacity: 0, y: 60 }, { opacity: 1, y: 0, ease: "power1.out", duration: 0.25 })
      .to(b, { opacity: 1, duration: 0.5 })
      .to(b, { opacity: i === 4 ? 1 : 0, y: i === 4 ? 0 : -40, ease: "power1.in", duration: 0.25 });
  });
  const targets = ".impact__line, .impact__sub, .trade__head, .activities li, .trade__ask, .markets__head, .markets__body, .coffee__intro, .specrow, .lots, .origin__body > *, .shipping__title, .route li, .terms > *, .export > *, .world__report, .faq h2, .faq__list, .contact__text, .form";
  gsap.utils.toArray(targets).forEach((el) => {
    el.classList.add("reveal");
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
}

// ---------- 3D tilt on the origin cards (desktop pointer only) ----------
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !REDUCED) {
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

// ---------- the shipping film plays only while on screen ----------
const shipVid = document.querySelector(".shipping__film video");
if (shipVid) {
  if (REDUCED) { shipVid.removeAttribute("autoplay"); shipVid.pause(); }
  else new IntersectionObserver(([en]) => { en.isIntersecting ? shipVid.play().catch(() => {}) : shipVid.pause(); }).observe(shipVid);
}

// ---------- lot and export links prefill the form ----------
const vol = document.getElementById("f-volume");
document.querySelectorAll("[data-lot]").forEach((a) => a.addEventListener("click", () => { vol.value = "Coffee lot " + a.dataset.lot + ", one full container"; }));
document.querySelectorAll("[data-prefill]").forEach((a) => a.addEventListener("click", () => { if (!vol.value) vol.value = a.dataset.prefill; }));

// ---------- enquiry form: delivered to the info inbox by Web3Forms ----------
// The access key is public by design (Web3Forms only ever sends to the inbox it was issued for).
// Without a key the form falls back to opening the visitor's email app.
const EMAIL = "info@rnfortisglobal.com";
const WEB3FORMS_KEY = "a22c8e3f-836b-49ab-b3bd-2e0e0eed7b82";
const form = document.getElementById("form"), note = document.getElementById("fnote");
const sendBtn = form.querySelector('button[type="submit"]');
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll("[required]").forEach((f) => {
    const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
    f.setAttribute("aria-invalid", String(bad));
    if (bad) ok = false;
  });
  if (!ok) { note.textContent = "Please fill in your name and a valid email."; return; }
  const d = new FormData(form);
  const subject = "Trade enquiry from " + (d.get("company") || d.get("name"));
  const body = `Name: ${d.get("name")}\nCompany: ${d.get("company") || "-"}\nEmail: ${d.get("email")}\nProduct and volume: ${d.get("volume") || "-"}\n\n${d.get("message") || ""}`;
  const href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  const thanks = () => { const b = document.createElement("b"); b.textContent = "Thanks, " + d.get("name") + ". "; return b; };
  const mailFallback = (lead) => {
    note.innerHTML = "";
    const a = document.createElement("a"); a.href = href; a.textContent = "Open it in your email app";
    note.append(thanks(), lead, a, ".");
    location.href = href;
  };
  if (!WEB3FORMS_KEY) { mailFallback("Your enquiry is ready to send to " + EMAIL + ". "); return; }
  if (d.get("botcheck")) return; // the hidden field only bots fill in
  sendBtn.disabled = true; sendBtn.textContent = "Sending…"; note.textContent = "";
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject, from_name: "RN Fortis website",
        replyto: d.get("email"),
        Name: d.get("name"), Company: d.get("company") || "-", Email: d.get("email"),
        "Product and volume": d.get("volume") || "-", Message: d.get("message") || "-",
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.success) throw new Error(out.message || res.status);
    form.reset();
    note.innerHTML = "";
    note.append(thanks(), "Your enquiry is in our inbox. We'll reply to " + d.get("email") + ".");
  } catch {
    mailFallback("It didn't send from here, so it's ready in your email app instead. ");
  } finally {
    sendBtn.disabled = false; sendBtn.textContent = "Send enquiry";
  }
});

if (import.meta.env.DEV) { window.__lenis = lenis; window.__ST = ScrollTrigger; window.__bgv = bgVideo; }
