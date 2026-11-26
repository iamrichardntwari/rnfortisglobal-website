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
    // Phones get a vertical cut of the same film (5 MB instead of 8 MB, framed for a tall screen).
    const res = await fetch(PHONE ? "/film-mobile.mp4" : "/film.mp4");
    if (!res.ok) throw new Error(res.status);
    bgVideo.src = URL.createObjectURL(await res.blob());
    bgVideo.load();
    bgVideo.addEventListener("loadedmetadata", async () => {
      // iOS Safari only paints frames of a video that has played once, so prime it silently.
      try { await bgVideo.play(); bgVideo.pause(); } catch {}
      lastVideoT = -1; scrubVideo();
      document.body.classList.add("video-ready");
    }, { once: true });
    lenis.on("scroll", scrubVideo);
    addEventListener("scroll", scrubVideo, { passive: true });
  } catch { document.body.classList.add("video-failed"); }
}
initVideo();

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

// ---------- enquiry form: no server yet, so it prepares the email in the visitor's mail app ----------
const EMAIL = "inquiries@rnfortisglobal.com";
const form = document.getElementById("form"), note = document.getElementById("fnote");
form.addEventListener("submit", (e) => {
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
  note.innerHTML = "";
  const b = document.createElement("b"); b.textContent = "Thanks, " + d.get("name") + ". ";
  const a = document.createElement("a"); a.href = href; a.textContent = "Open it in your email app";
  note.append(b, "Your enquiry is ready to send to " + EMAIL + ". ", a, ".");
  location.href = href;
});

if (import.meta.env.DEV) { window.__lenis = lenis; window.__ST = ScrollTrigger; window.__bgv = bgVideo; }
