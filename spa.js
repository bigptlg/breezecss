(function () {
  'use strict';
  const kind = document.documentElement.getAttribute('data-bdoc-spa');
  if (kind !== 'css' && kind !== 'cli') return;
  const main = kind === 'cli' ? document.getElementById('main-content') : document.querySelector('main');
  if (!main) return;
  const pages = Array.from(main.children).filter(el => el.id && (el.tagName === 'SECTION' || el.tagName === 'DIV'));
  if (!pages.length) return;
  const byId = new Map(pages.map(el => [el.id, el]));
  const firstId = pages[0].id;
  const originalTitle = document.title;
  const indexNav = document.getElementById('nav-lateral');
  const navLinks = indexNav ? Array.from(indexNav.querySelectorAll('a[href^="#"]')) : [];
  const activeClass = (indexNav && indexNav.getAttribute('data-nav-active')) || (navLinks[0] && navLinks[0].className);
  const inactiveClass = (indexNav && indexNav.getAttribute('data-nav-inactive')) || (navLinks[1] && navLinks[1].className);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null;

  function routeFor(id) {
    const el = document.getElementById(id);
    if (!el || !main.contains(el)) return null;
    let page = el;
    while (page && page.parentElement !== main) page = page.parentElement;
    return page && byId.has(page.id) ? { page, target: el } : null;
  }

  function readHash() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch (_) { id = location.hash.slice(1); }
    return routeFor(id) || { page: byId.get(firstId), target: byId.get(firstId) };
  }

  function titleFor(page) {
    const nav = document.querySelector('aside a[href="#' + CSS.escape(page.id) + '"]');
    const title = (nav && nav.textContent.trim()) || (page.querySelector('h1,h2')?.textContent.trim()) || 'Início';
    return title + ' — ' + originalTitle;
  }

  function markNav(page) {
    const navs = document.querySelectorAll('aside a[href^="#"]');
    navs.forEach(a => {
      const active = a.getAttribute('href') === '#' + page.id;
      if (kind === 'css' && (a.closest('#nav-lateral') || a.closest('#gaveta'))) {
        if (activeClass && inactiveClass) a.className = active ? activeClass : inactiveClass;
      } else {
        a.classList.toggle('active', active);
      }
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function closeMobile() {
    if (kind === 'cli') {
      document.body.classList.remove('menu-open');
      document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
    } else {
      const drawer = document.getElementById('gaveta');
      if (drawer) drawer.style.transform = '';
      const overlay = document.getElementById('pano-menu');
      if (overlay) overlay.style.display = 'none';
      document.getElementById('btn-menu')?.setAttribute('aria-expanded', 'false');
    }
  }

  function show(route, opts = {}) {
    const { page, target } = route;
    if (!page) return;
    pages.forEach(el => {
      const active = el === page;
      el.hidden = !active;
      if (active) el.style.removeProperty('display');
      else el.style.setProperty('display', 'none', 'important');
      el.setAttribute('aria-hidden', String(!active));
    });
    const changed = current !== page.id;
    current = page.id;
    document.title = titleFor(page);
    markNav(page);
    closeMobile();
    if (changed && !reduceMotion && page.animate) {
      page.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
    if (changed) window.dispatchEvent(new CustomEvent('breeze:docs:navigate', { detail: { id: page.id, app: kind } }));
    if (opts.scroll !== false) {
      requestAnimationFrame(() => {
        if (target && target !== page) target.scrollIntoView({ block: 'start', behavior: 'instant' });
        else window.scrollTo({ top: 0, behavior: 'instant' });
        if (changed) window.dispatchEvent(new Event('resize'));
      });
    }
  }

  function navigate(id, replace = false) {
    const route = routeFor(id);
    if (!route) return false;
    const hash = '#' + encodeURIComponent(id);
    if (location.hash !== hash) {
      if (replace) history.replaceState({ breezeDocs: true }, '', hash);
      else history.pushState({ breezeDocs: true }, '', hash);
    }
    show(route);
    return true;
  }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    const href = a.getAttribute('href');
    if (!href || href[0] !== '#' || href.length === 1) return;
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch (_) { id = href.slice(1); }
    if (!routeFor(id)) return;
    e.preventDefault();
    navigate(id);
  });

  window.addEventListener('popstate', () => show(readHash()));
  window.addEventListener('hashchange', () => show(readHash()));

  pages.forEach((page, i) => {
    const container = page.querySelector(':scope > div') || page;
    const nav = document.createElement('nav');
    nav.className = 'grid cols[1] sm:cols[2] gap[14px] mt[48px] pt[28px] border-t[1px_solid_rgba(148,163,184,0.12)]';
    nav.setAttribute('aria-label', 'Navegação entre secções');
    const items = [
      { index: i - 1, dir: '← Anterior', align: 'items-start text-left' },
      { index: i + 1, dir: 'Seguinte →', align: 'items-end text-right sm:col-start[2]' }
    ];
    for (const item of items) {
      if (item.index < 0 || item.index >= pages.length) {
        if (item.index < 0) {
          const spacer = document.createElement('div');
          spacer.className = 'hidden sm:block';
          nav.appendChild(spacer);
        }
        continue;
      }
      const targetPage = pages[item.index];
      const navMatch = document.querySelector('aside a[href="#' + CSS.escape(targetPage.id) + '"]');
      const label = (navMatch && navMatch.textContent.trim()) || (targetPage.querySelector('h1,h2')?.textContent.trim().slice(0, 48)) || targetPage.id;
      const link = document.createElement('a');
      link.href = '#' + targetPage.id;
      link.className = 'bdoc-pager-link flex flex-col gap[4px] p[16px_18px] rounded-2xl bg[rgba(15,24,44,0.72)] border[1px_solid_rgba(148,163,184,0.14)] text-[#eef4ff] no-underline transition duration[200ms] hover:border-color[rgba(0,255,136,0.45)] ' + item.align;
      const dirSpan = document.createElement('span');
      dirSpan.className = 'bdoc-pager-dir text-size[11.5px] uppercase tracking[0.12em] fw[700] text[#00ff88]';
      dirSpan.textContent = item.dir;
      const titleSpan = document.createElement('span');
      titleSpan.className = 'text-size[15px] fw[700] leading[1.35]';
      titleSpan.textContent = label;
      link.appendChild(dirSpan);
      link.appendChild(titleSpan);
      nav.appendChild(link);
    }
    container.appendChild(nav);
  });

  show(readHash());
  window.BreezeDocsSPA = Object.freeze({ navigate, get current() { return current; }, pages: pages.map(p => p.id), app: kind });
})();
