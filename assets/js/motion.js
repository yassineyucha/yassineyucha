/* ===== YUCHA motion layer =====
   Glass nav, editor HUD (timecode + timeline), and scroll choreography.
   Needs GSAP + ScrollTrigger (Lenis optional). Without them, or with reduced motion,
   only the nav/HUD states run and the page stays fully usable. */
(() => {
  const root = document.documentElement;
  const q = (s, c = document) => c.querySelector(s);
  const qa = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const dirSign = () => (root.dir === 'rtl' ? -1 : 1);
  let lenis = null;

  /* ---------- nav: glass pill after scrolling, hides while scrolling down ---------- */
  const nav = q('nav'), links = q('#lk');
  let lastY = 0;
  function updateNav(y) {
    nav.classList.toggle('s', y > 60);
    nav.classList.toggle('hide', y > lastY && y > 400 && !links.classList.contains('o'));
    lastY = y;
  }

  /* ---------- HUD: scroll position shown as an edit timeline ---------- */
  const SECTIONS = [['#top', 'Intro'], ['#work', 'Work'], ['#reel', 'Reel'], ['#about', 'About'], ['#services', 'Services'], ['#process', 'Process'], ['#contact', 'Contact']];
  const FPS = 25, RUNTIME_S = 154;
  const hud = q('.hud'), tc = q('#tc'), clip = q('#clip'), tl = q('#tl'), head = q('#ph');
  let marks = [];
  const pad = n => String(n).padStart(2, '0');
  const maxScroll = () => Math.max(1, root.scrollHeight - innerHeight);

  function timecode(p) {
    const f = Math.round(p * RUNTIME_S * FPS), s = Math.floor(f / FPS);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f % FPS].map(pad).join(':');
  }
  function goTo(el) {
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -70, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function layoutTimeline() {
    const max = maxScroll();
    marks = SECTIONS.map(([sel, label], i) => {
      const el = q(sel);
      return el && { el, label, i, start: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY) / max)) };
    }).filter(Boolean);
    qa('span', tl).forEach(s => s.remove());
    marks.forEach((m, i) => {
      const end = i < marks.length - 1 ? marks[i + 1].start : 1;
      const seg = document.createElement('span');
      seg.style.flex = Math.max(end - m.start, 0.01);
      seg.onclick = () => goTo(m.el);
      tl.insertBefore(seg, head);
      m.seg = seg;
    });
    updateHud(scrollY);
  }
  function updateHud(y) {
    const p = Math.min(1, Math.max(0, y / maxScroll()));
    tc.textContent = timecode(p);
    head.style.transform = `translateX(${p * (tl.clientWidth - 2)}px)`;
    const cur = marks.reduce((acc, m) => (p >= m.start - 0.001 ? m : acc), marks[0]);
    if (cur) {
      clip.textContent = `${pad(cur.i + 1)} / ${cur.label}`;
      marks.forEach(m => m.seg.classList.toggle('on', m === cur));
    }
    hud.classList.toggle('on', y > innerHeight * 0.5);
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateNav(scrollY); updateHud(scrollY); ticking = false; });
  }, { passive: true });
  addEventListener('resize', layoutTimeline);
  addEventListener('load', layoutTimeline);
  layoutTimeline();

  /* ---------- glass sheen follows the pointer ---------- */
  if (finePointer) {
    document.addEventListener('pointermove', e => {
      const g = e.target.closest && e.target.closest('.glass, .card .th');
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', `${e.clientX - r.left}px`);
      g.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  /* ================= full motion ================= */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('m');

  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1), el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      goTo(el);
    });
    const dlg = q('#dlg');
    new MutationObserver(() => (dlg.open ? lenis.stop() : lenis.start())).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }

  /* wraps every word in .wd > .wi so it can be revealed; keeps inline markup (em, .acc, br) */
  function splitWords(el) {
    if (!el) return [];
    if (q('.wd', el)) return qa('.wi', el);
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.append(tok); return; }
          const wd = document.createElement('span'), wi = document.createElement('span');
          wd.className = 'wd'; wi.className = 'wi'; wi.textContent = tok;
          wd.append(wi); frag.append(wd);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    return qa('.wi', el);
  }

  function heroScene() {
    const [l1, l2] = qa('.hero h1 > span'), d = dirSign();
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to(l1, { xPercent: -14 * d }, 0)
      .to(l2, { xPercent: 14 * d }, 0)
      .to('.hero > div:first-child > p, .hero .btns', { y: -60, opacity: 0 }, 0)
      .to('.ph:nth-child(1)', { xPercent: -40, yPercent: 18, rotation: -16 }, 0)
      .to('.ph:nth-child(2)', { yPercent: -12, scale: 1.08 }, 0)
      .to('.ph:nth-child(3)', { xPercent: 40, yPercent: 26, rotation: 16 }, 0)
      .to('.badge', { yPercent: -220 }, 0)
      .to('.chip', { yPercent: 260 }, 0)
      .to('.meta', { opacity: 0 }, 0);
  }

  function markScene() {
    const letters = qa('#mark span'), offsets = [70, -40, 90, -30, 55];
    letters.forEach(s => { s.dataset.c = s.textContent; });
    gsap.fromTo(letters,
      { '--f': '100%', yPercent: i => offsets[i % offsets.length] },
      { '--f': '0%', yPercent: 0, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: '#mark', start: 'top 95%', end: 'bottom 45%', scrub: 0.6 } });
  }

  function tickerScene() {
    const loop = gsap.to('#tk', { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
    ScrollTrigger.create({
      onUpdate: self => {
        const boost = Math.min(Math.abs(self.getVelocity()) / 250, 8);
        gsap.timeline()
          .to(loop, { timeScale: self.direction * (1 + boost), duration: 0.2, overwrite: true })
          .to(loop, { timeScale: self.direction, duration: 1.2 });
      },
    });
  }

  function headingReveals() {
    qa('section:not(.reel) h2').forEach(h => {
      gsap.from(splitWords(h), { yPercent: 115, rotation: 7, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: h, start: 'top 85%' } });
    });
  }

  /* showreel: a 9:16 clip on the timeline grows into a full-bleed frame */
  function reelScene() {
    const media = q('.reel-media'), words = splitWords(q('.reel h2'));
    const cardInset = () => {
      const h = innerHeight * 0.62, w = Math.min(h * 9 / 16, innerWidth * 0.72);
      return `inset(${(innerHeight - h) / 2}px ${(innerWidth - w) / 2}px round 26px)`;
    };
    gsap.timeline({ scrollTrigger: { trigger: '.reel', start: 'top top', end: '+=160%', pin: true, scrub: 0.8, invalidateOnRefresh: true } })
      .fromTo(media, { clipPath: cardInset, rotation: -4 }, { clipPath: 'inset(0px 0px round 0px)', rotation: 0, ease: 'power2.inOut', duration: 1 })
      .fromTo('.reel-media video', { scale: 1.35 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      // fromTo, not from: invalidateOnRefresh would otherwise re-record the hidden state as the end state
      .fromTo(words, { yPercent: 115 }, { yPercent: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }, 0.65)
      .fromTo('.reel .lbl, .reel-note', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, 0.75)
      .to({}, { duration: 0.3 });
  }

  function aboutScene() {
    gsap.fromTo(splitWords(q('.ab .big')), { opacity: 0.15 }, { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: '.ab .big', start: 'top 80%', end: 'bottom 45%', scrub: true } });
    gsap.fromTo('.ab .im img', { yPercent: -8, scale: 1.2 }, { yPercent: 8, scale: 1.2, ease: 'none', scrollTrigger: { trigger: '.ab', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function servicesScene() {
    qa('#sv li').forEach((li, i) => gsap.from(li, {
      xPercent: (i % 2 ? 8 : -8) * dirSign(), opacity: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform',
      scrollTrigger: { trigger: li, start: 'top 90%' },
    }));
  }

  /* process: horizontal track on desktop, progress bar everywhere */
  function processScene(mm) {
    const bar = q('.pr-bar i');
    mm.add('(min-width: 901px)', () => {
      root.classList.add('m-h');
      const section = q('#process'), track = q('.pr');
      const dist = () => {
        const cs = getComputedStyle(section);
        return Math.max(0, track.scrollWidth - (section.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
      };
      gsap.set(bar, { '--p': 0 });
      const slide = gsap.to(track, {
        x: () => -dist() * dirSign(), ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist() * 1.2}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, onUpdate: s => gsap.set(bar, { '--p': s.progress }) },
      });
      if (dirSign() === 1) {
        qa('.st').forEach(st => gsap.fromTo(st, { rotationY: -22, scale: 0.9, opacity: 0.35 }, {
          rotationY: 0, scale: 1, opacity: 1, transformPerspective: 1000, transformOrigin: '0% 50%', ease: 'none',
          scrollTrigger: { trigger: st, containerAnimation: slide, start: 'left 100%', end: 'left 60%', scrub: true },
        }));
      }
      return () => root.classList.remove('m-h');
    });
    mm.add('(max-width: 900px)', () => {
      gsap.fromTo(bar, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '.pr', start: 'top 80%', end: 'bottom 60%', scrub: true } });
    });
  }

  function contactScene() {
    // each tween needs its own trigger config object; GSAP binds the object to the tween
    const st = () => ({ trigger: '.cg', start: 'top 85%' });
    gsap.from('#f', { y: 80, opacity: 0, rotationX: -12, transformPerspective: 900, duration: 1.2, ease: 'expo.out', scrollTrigger: st() });
    gsap.from('#cl a', { xPercent: -10 * dirSign(), opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: st() });
  }

  function auraScene() {
    const [a, b, c] = qa('.aura i');
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { start: 0, end: 'max', scrub: 1.5 } })
      .to(a, { x: '55vw', y: '70vh' }, 0)
      .to(b, { x: '-60vw', y: '-10vh' }, 0)
      .to(c, { x: '30vw', y: '-85vh' }, 0);
  }

  /* fast scrolling bends the grid and the services list */
  function velocityScene() {
    const setters = qa('#grid, #sv').map(t => gsap.quickTo(t, 'skewY', { duration: 0.5, ease: 'power3' }));
    const settle = gsap.delayedCall(0.15, () => setters.forEach(f => f(0))).pause();
    ScrollTrigger.create({
      onUpdate: s => {
        const k = gsap.utils.clamp(-5, 5, s.getVelocity() / -400);
        setters.forEach(f => f(k));
        settle.restart(true);
      },
    });
  }

  let ctx, mm;
  function build() {
    mm = gsap.matchMedia();
    ctx = gsap.context(() => {
      heroScene(); markScene(); tickerScene(); headingReveals(); reelScene();
      aboutScene(); servicesScene(); processScene(mm); contactScene(); auraScene(); velocityScene();
    });
  }

  /* work cards are re-rendered on filter/language change, so they get their own context */
  let cardCtx, refreshTimer;
  function cardScene() {
    if (cardCtx) cardCtx.revert();
    cardCtx = gsap.context(() => {
      gsap.set('#grid .card', { opacity: 0 });
      ScrollTrigger.batch('#grid .card', {
        start: 'top 92%', once: true,
        onEnter: els => gsap.fromTo(els,
          { y: 90, rotationX: -28, opacity: 0, transformPerspective: 900, transformOrigin: '50% 0%' },
          { y: 0, rotationX: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08 }),
      });
    });
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 60);
  }

  /* ---------- pointer-only interactions (set up once) ---------- */
  function initPointer() {
    const stack = q('.stack');
    q('.hero').addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      gsap.to(stack, { rotationY: x * 10, rotationX: -y * 8, transformPerspective: 1100, duration: 0.9, ease: 'power3' });
    });

    qa('.cta, .ghost, .play').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    const grid = q('#grid');
    grid.addEventListener('pointermove', e => {
      const th = e.target.closest('.card:not(.slot) .th');
      if (!th) return;
      const r = th.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(th, { rotationY: px * 14, rotationX: -py * 14, transformPerspective: 700, duration: 0.5, ease: 'power3' });
    });
    grid.addEventListener('pointerout', e => {
      const th = e.target.closest('.th');
      if (th && !th.contains(e.relatedTarget)) gsap.to(th, { rotationX: 0, rotationY: 0, duration: 0.9, ease: 'elastic.out(1, .5)' });
    });

    initServicePreview();
    initCursor();
  }

  function initServicePreview() {
    if (typeof V === 'undefined') return;
    const box = q('.svp'), vid = q('.svp video'), list = q('#sv');
    const CLIP_FOR_SERVICE = [0, 4, 9, 6, 2];
    const xTo = gsap.quickTo(box, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(box, 'y', { duration: 0.5, ease: 'power3' });
    gsap.set(box, { scale: 0.4 });
    let current = null, lastX = 0;
    list.addEventListener('pointermove', e => {
      xTo(e.clientX); yTo(e.clientY);
      gsap.to(box, { rotation: gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6), duration: 0.4 });
      lastX = e.clientX;
    });
    list.addEventListener('pointerover', e => {
      const li = e.target.closest('li');
      if (!li || li === current) return;
      current = li;
      vid.src = V[CLIP_FOR_SERVICE[[...list.children].indexOf(li)] ?? 0];
      vid.play().catch(() => {});
      gsap.to(box, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
    });
    list.addEventListener('pointerleave', () => {
      current = null;
      gsap.to(box, { scale: 0.4, opacity: 0, duration: 0.3 });
      vid.pause();
    });
  }

  function initCursor() {
    const cur = q('.cur'), label = q('.cur span');
    const WORDS = { en: ['View', 'Play'], fr: ['Voir', 'Lire'], ar: ['عرض', 'تشغيل'] };
    gsap.set(cur, { scale: 0.18 });
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      gsap.to(cur, { opacity: 1, duration: 0.3, overwrite: 'auto' });
      xTo(e.clientX); yTo(e.clientY);
    }, { passive: true });
    root.addEventListener('mouseleave', () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('.card:not(.slot), #pf, a, button');
      const words = WORDS[root.lang] || WORDS.en;
      const text = !t ? '' : t.matches('.card') ? words[0] : t.id === 'pf' ? words[1] : '';
      cur.classList.toggle('lbl-on', !!text);
      label.textContent = text;
      gsap.to(cur, { scale: text ? 1 : t ? 0.42 : 0.18, duration: 0.4, ease: 'power3' });
    });
  }

  build();
  cardScene();
  if (finePointer) initPointer();
  document.addEventListener('yucha:draw', cardScene);
  document.addEventListener('yucha:lang', () => {
    ctx.revert(); mm.revert();
    build();
    ScrollTrigger.refresh();
  });
  ScrollTrigger.addEventListener('refresh', layoutTimeline);
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
