import { createVelocityTracker, project } from '@/lib/gesture';
import { isTabRoot, navTransition, type NavTransition } from '@/lib/navigation';
import type { RouteLocationNormalized } from 'vue-router';

/*
 * Transisi halaman gaya iOS di HP (mockup App.dc.html navSnap/playNav/setEdge).
 *
 * Sebelum pindah, salinan halaman lama dibekukan (`ghost`) dan menutupi layar
 * supaya pergantian DOM tidak terlihat. Setelah halaman baru selesai dirender
 * (page:finish), keduanya dianimasikan dengan WAAPI:
 * - push: halaman baru masuk dari kanan di atas, halaman lama mundur ke -30%
 *   di bawah peredup; pop kebalikannya. 350ms kurva drawer.
 * - modal-in/out: form masuk dari bawah 320ms, keluar ke bawah 200ms.
 * Tab bar dan tombol + (data-chrome) diam kalau ada di kedua halaman, ikut
 * bergeser kalau hanya ada di satu sisi. Antar tab tanpa animasi.
 *
 * Geser dari tepi kiri (24px) di halaman rincian = kembali: router.back()
 * langsung jalan, halaman lama mengikuti jari, momentum memutuskan jadi atau
 * batal (batal = maju lagi ke halaman itu, salinan menutupi selama dirender).
 *
 * Hanya di HP (< 768px); iPad/desktop pindah halaman tanpa animasi.
 * Reduce Motion: salinan memudar 200ms, tanpa gerak.
 */

const DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EDGE_PX = 24;
const Z = { live: '101', dim: '100', ghost: '100', ghostTop: '102', chrome: '103' } as const;

interface Nav {
  ghost: HTMLElement;
  dim: HTMLElement;
  kind: NavTransition;
  /** Halaman tujuan punya tab bar dan halaman asal tidak (pop dari form): tab bar ikut masuk */
  chromeIn: boolean;
  /** Halaman asal dan tujuan sama-sama punya tab bar: tab bar diam di atas semuanya */
  chromeStill: boolean;
  played: boolean;
  anims: Animation[];
  fallback?: ReturnType<typeof setTimeout>;
}

/** Tab bar dan + di atas halaman yang bergeser; urutan aslinya (gradasi di bawah tab bar) dijaga */
function raiseChrome(els: HTMLElement[]) {
  for (const el of els) {
    const own = Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
    el.style.zIndex = String(Number(Z.chrome) + own);
  }
}

const isPhone = () => matchMedia('(max-width: 767.98px)').matches;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const stageEl = () => document.querySelector<HTMLElement>('[data-page-stage]');
const chromeEls = () => [...document.querySelectorAll<HTMLElement>('[data-chrome]')];
const isModal = (route: RouteLocationNormalized) =>
  route.meta.layout === false && !route.path.startsWith('/invite');

/** Salinan beku layar sekarang: halaman (posisi gulir dipertahankan) + tab bar kalau diminta */
function freeze(withChrome: boolean): HTMLElement | null {
  const stage = stageEl();
  if (!stage) return null;
  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  // transform membuat elemen fixed di dalam salinan menempel ke salinan, bukan layar
  ghost.style.cssText =
    'position:fixed;inset:0;overflow:hidden;pointer-events:none;background:var(--background);transform:translateX(0);';
  ghost.style.zIndex = Z.ghost;
  const rect = stage.getBoundingClientRect();
  const copy = stage.cloneNode(true) as HTMLElement;
  copy.removeAttribute('data-page-stage');
  copy.style.position = 'absolute';
  copy.style.top = `${rect.top}px`;
  copy.style.left = `${rect.left}px`;
  copy.style.width = `${rect.width}px`;
  copy.style.margin = '0';
  ghost.appendChild(copy);
  // Gulir di dalam elemen (mis. daftar di lembar) ikut disalin
  const src = stage.querySelectorAll<HTMLElement>('*');
  const dst = copy.querySelectorAll<HTMLElement>('*');
  src.forEach((el, i) => el.scrollTop && dst[i] && (dst[i]!.scrollTop = el.scrollTop));
  if (withChrome) for (const el of chromeEls()) ghost.appendChild(el.cloneNode(true));
  document.body.appendChild(ghost);
  return ghost;
}

function makeDim(): HTMLElement {
  const dim = document.createElement('div');
  dim.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:var(--nav-dim);opacity:0;';
  dim.style.zIndex = Z.dim;
  document.body.appendChild(dim);
  return dim;
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  let nav: Nav | null = null;
  let position = (window.history.state?.position as number | undefined) ?? 0;
  /** Gestur tepi yang sedang berjalan; diisi saat arah sudah terkunci */
  let edge: {
    id: number;
    x0: number;
    y0: number;
    dx: number;
    locked: boolean;
    tracker: ReturnType<typeof createVelocityTracker>;
  } | null = null;
  /** Salinan yang menutupi layar sementara halaman dikembalikan setelah geser-kembali batal */
  let restoring: HTMLElement | null = null;

  function resetLive() {
    const stage = stageEl();
    if (stage) {
      stage.style.transform = '';
      stage.style.transition = '';
      stage.style.position = '';
      stage.style.zIndex = '';
    }
    for (const el of chromeEls()) {
      el.style.transform = '';
      el.style.transition = '';
      el.style.zIndex = '';
    }
  }

  function endNav() {
    if (!nav) return;
    const n = nav;
    nav = null;
    clearTimeout(n.fallback);
    n.anims.forEach((a) => a.cancel());
    n.ghost.remove();
    n.dim.remove();
    resetLive();
  }

  router.beforeEach((to, from) => {
    endNav();
    if (restoring || !from.matched.length || !isPhone()) return;
    const fromChrome = !isModal(from) && chromeEls().length > 0;
    const toModal = isModal(to);
    // Tab bar ikut salinan kalau halaman tujuan tidak punya tab bar (form)
    const ghost = freeze(fromChrome && toModal);
    if (!ghost) return;
    nav = {
      ghost,
      dim: makeDim(),
      kind: null,
      chromeIn: !fromChrome && !toModal,
      chromeStill: fromChrome && !toModal,
      played: false,
      anims: [],
    };
  });

  router.afterEach((to, from, failure) => {
    const next = (window.history.state?.position as number | undefined) ?? position;
    const back = next < position;
    position = next;
    if (failure) return endNav();
    if (!nav) return;
    nav.kind = navTransition(
      { path: from.path, modal: isModal(from) },
      { path: to.path, modal: isModal(to) },
      back,
    );
    if (!nav.kind) return endNav();
    // Halaman yang sama dirender ulang tanpa page:finish: jangan biarkan salinan menggantung
    const n = nav;
    n.fallback = setTimeout(() => nav === n && !n.played && start(n), 700);
  });

  /** Halaman baru siap: animasi otomatis, atau ikut jari kalau gestur tepi masih berjalan */
  function start(n: Nav) {
    if (edge?.locked) startLiveEdge();
    else play(n);
  }

  nuxtApp.hook('page:finish', () => {
    if (restoring) {
      // Geser-kembali dibatalkan: halaman sudah dirender lagi di bawah salinan
      const cover = restoring;
      restoring = null;
      requestAnimationFrame(() => cover.remove());
      return;
    }
    const n = nav;
    if (n && n.kind && !n.played) requestAnimationFrame(() => nav === n && !n.played && start(n));
  });

  function play(n: Nav) {
    n.played = true;
    clearTimeout(n.fallback);
    const stage = stageEl();
    if (!stage) return endNav();
    const w = window.innerWidth;
    const chrome = chromeEls();

    if (reduceMotion()) {
      n.ghost.style.zIndex = Z.ghostTop;
      n.anims.push(n.ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease' }));
      n.anims[0]!.onfinish = () => nav === n && endNav();
      return;
    }

    stage.style.position = 'relative';
    if (n.chromeStill) raiseChrome(chrome);
    const X = (a: number, b: number) => [
      { transform: `translateX(${a}px)` },
      { transform: `translateX(${b}px)` },
    ];
    const Y = (a: string, b: string) => [
      { transform: `translateY(${a})` },
      { transform: `translateY(${b})` },
    ];
    const opt = (duration: number): KeyframeAnimationOptions => ({
      duration,
      easing: DRAWER,
      fill: 'both',
    });

    switch (n.kind) {
      case 'push':
        stage.style.zIndex = Z.live;
        n.anims.push(
          stage.animate(X(w, 0), opt(350)),
          n.ghost.animate(X(0, -0.3 * w), opt(350)),
          n.dim.animate([{ opacity: 0 }, { opacity: 1 }], opt(350)),
        );
        break;
      case 'pop':
        stage.style.zIndex = '99';
        n.ghost.style.zIndex = Z.ghostTop;
        n.anims.push(
          n.ghost.animate(X(0, w), opt(350)),
          stage.animate(X(-0.3 * w, 0), opt(350)),
          n.dim.animate([{ opacity: 1 }, { opacity: 0 }], opt(350)),
        );
        if (n.chromeIn) for (const el of chrome) n.anims.push(el.animate(X(-0.3 * w, 0), opt(350)));
        break;
      case 'modal-in':
      case 'swap-modal':
        stage.style.zIndex = Z.live;
        n.anims.push(stage.animate(Y('100%', '0'), opt(320)));
        break;
      case 'modal-out':
        n.ghost.style.zIndex = Z.ghostTop;
        n.anims.push(n.ghost.animate(Y('0', '100%'), opt(200)));
        break;
    }
    const first = n.anims[0];
    if (first) first.onfinish = () => nav === n && endNav();
    else endNav();
  }

  // ----- geser dari tepi kiri untuk kembali -----
  /** Hanya halaman rincian yang punya riwayat sebelumnya; form (Batal) dan tab utama tidak */
  function canEdgeBack() {
    const route = router.currentRoute.value;
    return !isTabRoot(route.path) && !isModal(route) && !!window.history.state?.back;
  }

  function setEdge(x: number, ms = 0) {
    const n = nav;
    if (!n) return;
    const stage = stageEl();
    const w = window.innerWidth;
    const p = Math.max(0, Math.min(1, x / w));
    const t = ms ? `transform ${ms}ms ${DRAWER}` : 'none';
    n.ghost.style.transition = t;
    n.ghost.style.transform = `translateX(${x}px)`;
    n.dim.style.transition = ms ? `opacity ${ms}ms ${DRAWER}` : 'none';
    n.dim.style.opacity = String(1 - p);
    const under = `translateX(${-0.3 * w * (1 - p)}px)`;
    if (stage) {
      stage.style.transition = t;
      stage.style.transform = under;
    }
    if (n.chromeIn)
      for (const el of chromeEls()) {
        el.style.transition = t;
        el.style.transform = under;
      }
  }

  function startLiveEdge() {
    const n = nav;
    if (!n) return;
    n.played = true;
    clearTimeout(n.fallback);
    const stage = stageEl();
    if (stage) {
      stage.style.position = 'relative';
      stage.style.zIndex = '99';
    }
    if (n.chromeStill) raiseChrome(chromeEls());
    n.ghost.style.zIndex = Z.ghostTop;
    setEdge(edge?.dx ?? 0);
  }

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (edge || nav || restoring || !isPhone() || reduceMotion()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.clientX > EDGE_PX || !canEdgeBack()) return;
      const tracker = createVelocityTracker();
      tracker.reset(e.clientX);
      edge = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, locked: false, tracker };
    },
    { capture: true },
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      const d = edge;
      if (!d || e.pointerId !== d.id) return;
      let dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (!d.locked) {
        if (Math.hypot(dx, dy) < 10) return;
        if (dx < Math.abs(dy)) {
          edge = null; // gulir biasa
          return;
        }
        d.locked = true;
        d.x0 += 10;
        dx -= 10;
        router.back();
      }
      d.dx = Math.max(0, dx);
      d.tracker.add(e.clientX);
      // Sebelum halaman tujuan siap, posisi jari disimpan dan dipakai saat startLiveEdge
      if (nav?.played) setEdge(d.dx);
    },
    { capture: true },
  );

  function release(e: PointerEvent) {
    const d = edge;
    if (!d || e.pointerId !== d.id) return;
    edge = null;
    if (!d.locked) return;
    // Klik yang tersisa setelah geser jangan memicu tombol di bawah jari
    const swallow = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);

    const n = nav;
    if (!n) return;
    if (!n.played) startLiveEdge();
    const w = window.innerWidth;
    const v = d.tracker.velocity(); // px/ms
    const go = e.type !== 'pointercancel' && d.dx + project(v * 1000) > w / 2 && v > -0.05;
    // Kurva drawer berangkat ~2,25× kecepatan rata-ratanya: durasi menyambung kecepatan jari
    const rest = go ? w - d.dx : d.dx;
    const ms = Math.round(
      Math.max(180, Math.min(400, Math.abs(v) > 0.1 ? (2.25 * rest) / Math.abs(v) : 320)),
    );
    setEdge(go ? w : 0, ms);
    setTimeout(() => {
      if (nav !== n) return;
      if (go) return endNav();
      // Batal: salinan tetap menutupi, halaman tadi dirender lagi di bawahnya
      restoring = n.ghost;
      n.anims = [];
      n.dim.remove();
      nav = null;
      resetLive();
      router.go(1);
      // Maju gagal (riwayat hilang): jangan biarkan salinan menutupi layar
      const cover = n.ghost;
      setTimeout(() => {
        if (restoring !== cover) return;
        restoring = null;
        cover.remove();
      }, 1500);
    }, ms);
  }
  window.addEventListener('pointerup', release, { capture: true });
  window.addEventListener('pointercancel', release, { capture: true });
});
