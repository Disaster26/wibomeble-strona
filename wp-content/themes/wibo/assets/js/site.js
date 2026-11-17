/* WIBO meble: menu, pokaz zdjęć, galerie (palec/mysz), powiększanie, formularz, baner cookies, mapa. Bez bibliotek. */
(function () {
  'use strict';
  var d = document, raf = window.requestAnimationFrame || function (f) { setTimeout(f, 16); };
  var SL = '<svg aria-hidden="true"><use href="#strz-l"/></svg>', SP = '<svg aria-hidden="true"><use href="#strz-p"/></svg>';

  /* menu mobilne */
  var bg = d.querySelector('.burger'), mm = d.getElementById('menu-mob');
  function menu(o) { mm.classList.toggle('otw', o); bg.setAttribute('aria-expanded', o ? 'true' : 'false'); bg.setAttribute('aria-label', o ? 'Zamknij menu' : 'Otwórz menu'); d.body.style.overflow = o ? 'hidden' : ''; }
  if (bg && mm) {
    bg.addEventListener('click', function () { menu(!mm.classList.contains('otw')); });
    mm.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mm.classList.contains('otw')) { menu(false); bg.focus(); } });
  }

  /* przeciąganie myszą toru przewijanego w bok; po przeciągnięciu klik nie otwiera zdjęcia/linku */
  function ciagnij(tor, snap) {
    var x0 = 0, s0 = 0, ruch = false, wc = false;
    tor.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      wc = true; ruch = false; x0 = e.clientX; s0 = tor.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!wc) return;
      var dx = e.clientX - x0;
      if (!ruch && Math.abs(dx) > 5) { ruch = true; tor.classList.add('ciagnie'); }
      if (ruch) { e.preventDefault(); tor.scrollLeft = s0 - dx; }
    });
    window.addEventListener('pointerup', function () {
      if (!wc) return;
      wc = false;
      if (ruch) {
        tor.classList.remove('ciagnie');
        if (snap) { var w = tor.clientWidth; tor.scrollTo({ left: Math.round(tor.scrollLeft / w) * w, behavior: 'smooth' }); }
        setTimeout(function () { ruch = false; }, 0);
      }
    });
    tor.addEventListener('click', function (e) { if (ruch) { e.preventDefault(); e.stopPropagation(); } }, true);
    tor.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }
  [].forEach.call(d.querySelectorAll('[data-ciagnij]'), function (t) { ciagnij(t, false); });

  /* powiększanie zdjęć (lightbox) - grupa = galeria, karuzela albo pojedyncze zdjęcie */
  var lb = d.getElementById('lb'), lbImg, lbOpis, lista = [], poz = 0, ostatni = null;
  if (lb) {
    lbImg = lb.querySelector('img'); lbOpis = lb.querySelector('.opis');
    var pokazLb = function () { var it = lista[poz]; lbImg.src = it.src; lbImg.alt = it.alt; lbOpis.textContent = it.alt + (lista.length > 1 ? '  ' + (poz + 1) + ' / ' + lista.length : ''); lb.querySelector('.l').hidden = lb.querySelector('.p').hidden = lista.length < 2; };
    var zamkLb = function () { lb.hidden = true; d.body.style.overflow = ''; lbImg.removeAttribute('src'); if (ostatni) ostatni.focus(); };
    var krokLb = function (k) { poz = (poz + k + lista.length) % lista.length; pokazLb(); };
    lb.querySelector('.zamk').addEventListener('click', zamkLb);
    lb.querySelector('.l').addEventListener('click', function () { krokLb(-1); });
    lb.querySelector('.p').addEventListener('click', function () { krokLb(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) zamkLb(); });
    d.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') zamkLb(); if (e.key === 'ArrowLeft') krokLb(-1); if (e.key === 'ArrowRight') krokLb(1); });
    var lx = null;
    lb.addEventListener('pointerdown', function (e) { lx = e.clientX; });
    lb.addEventListener('pointerup', function (e) { if (lx === null) return; var dx = e.clientX - lx; if (Math.abs(dx) > 50) krokLb(dx < 0 ? 1 : -1); lx = null; });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('button.zoom'); if (!b || e.defaultPrevented) return;
      var grupa = b.closest('.galeria, .karuzela') || b.parentNode;
      var bt = [].slice.call(grupa.querySelectorAll('button.zoom'));
      lista = bt.map(function (x) { var im = x.querySelector('img'); return { src: x.getAttribute('data-duze'), alt: im ? im.alt : '' }; });
      poz = Math.max(0, bt.indexOf(b)); ostatni = b;
      pokazLb(); lb.hidden = false; d.body.style.overflow = 'hidden'; lb.querySelector('.zamk').focus();
    });
  }

  /* kolejne zdjęcia galerii wczytywane dopiero, gdy ktoś zacznie ją oglądać */
  function zaladuj(tor) {
    if (tor.dataset.zal) return; tor.dataset.zal = '1';
    [].forEach.call(tor.querySelectorAll('img[data-src]'), function (im) { if (im.dataset.srcset) im.srcset = im.dataset.srcset; im.src = im.dataset.src; im.removeAttribute('data-src'); im.removeAttribute('data-srcset'); });
  }
  function przyOgladaniu(kont, tor) {
    var f = function () { zaladuj(tor); };
    ['pointerdown', 'touchstart', 'mouseenter', 'focusin'].forEach(function (ev) { kont.addEventListener(ev, f, { passive: true, once: true }); });
    tor.addEventListener('scroll', f, { passive: true, once: true });
  }

  /* strzałki do toru (komputer) */
  function strzalki(kont, tor, krok) {
    var l = d.createElement('button'), p = d.createElement('button');
    l.type = p.type = 'button'; l.className = 'strz l'; p.className = 'strz p'; l.innerHTML = SL; p.innerHTML = SP;
    l.setAttribute('aria-label', 'Poprzednie zdjęcie'); p.setAttribute('aria-label', 'Następne zdjęcie');
    kont.appendChild(l); kont.appendChild(p);
    l.addEventListener('click', function () { tor.scrollBy({ left: -krok(), behavior: 'smooth' }); });
    p.addEventListener('click', function () { tor.scrollBy({ left: krok(), behavior: 'smooth' }); });
    return function stan() { raf(function () { var max = tor.scrollWidth - tor.clientWidth - 4; l.disabled = tor.scrollLeft <= 4; p.disabled = tor.scrollLeft >= max; }); };
  }

  /* karuzele w kartach (4:3): palec, mysz, strzałki, licznik 1 / N */
  [].forEach.call(d.querySelectorAll('[data-karuzela]'), function (k) {
    var tor = k.querySelector('.kar-tor'), n = tor.children.length, licz = k.querySelector('.kar-licz');
    if (n < 2) return;
    przyOgladaniu(k, tor);
    tor.setAttribute('tabindex', '0'); tor.setAttribute('aria-label', 'Zdjęcia: ' + (k.getAttribute('data-nazwa') || '') + ', przesuń w bok');
    ciagnij(tor, true);
    var stan = strzalki(k, tor, function () { return tor.clientWidth; });
    var t = 0;
    tor.addEventListener('scroll', function () { if (t) return; t = 1; raf(function () { t = 0; if (licz) licz.textContent = (Math.round(tor.scrollLeft / tor.clientWidth) + 1) + ' / ' + n; stan(); }); }, { passive: true });
    tor.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tor.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * tor.clientWidth, behavior: 'smooth' }); } });
    k.addEventListener('mouseenter', stan, { once: true });
  });

  /* galerie-paski (podstrona działu): palec, mysz, strzałki, licznik */
  [].forEach.call(d.querySelectorAll('[data-galeria]'), function (g) {
    var ps = g.querySelector('.pasek'), tor = g.querySelector('.pasek-tor'), bt = tor.querySelectorAll('button'), lic = g.querySelector('.licznik'), n = bt.length;
    ciagnij(tor, false);
    przyOgladaniu(g, tor);
    if ('IntersectionObserver' in window) { var ob = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { ob.disconnect(); setTimeout(function () { zaladuj(tor); }, 2500); } }); ob.observe(tor); }
    if (n < 2) return;
    tor.setAttribute('tabindex', '0'); tor.setAttribute('aria-label', 'Zdjęcia: ' + (g.getAttribute('data-nazwa') || '') + ', przesuń w bok');
    var stan = strzalki(ps, tor, function () { return tor.clientWidth * 0.8; });
    var t = 0;
    tor.addEventListener('scroll', function () {
      if (t) return; t = 1;
      raf(function () {
        t = 0; var k = 0, sl = tor.scrollLeft, max = tor.scrollWidth - tor.clientWidth - 4;
        for (var i = 0; i < n; i++) { if (bt[i].offsetLeft - tor.offsetLeft <= sl + 8) k = i; }
        if (sl >= max) k = n - 1;
        lic.textContent = 'Zdjęcie ' + (k + 1) + ' z ' + n + ' - przesuń lub kliknij, aby powiększyć';
        stan();
      });
    }, { passive: true });
    tor.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tor.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * tor.clientWidth * 0.8, behavior: 'smooth' }); } });
    ps.addEventListener('mouseenter', stan, { once: true });
  });

  /* pokaz zdjęć w pierwszym ekranie: przenikanie z błyskiem i powolny najazd, zmienia się sam, przesuwany palcem i myszą */
  var bezRuchu = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = d.querySelector('.hero'), pk = hero && hero.querySelector('.pokaz');
  if (pk) {
    var sl = pk.querySelectorAll('figure'), n = sl.length, ak = 0, kr = hero.querySelectorAll('.kropki button'), tm = 0, tw = 0;
    var wczytaj = function (f) { var im = f && f.querySelector('img[data-src]'); if (!im) return; if (im.dataset.srcset) im.srcset = im.dataset.srcset; im.src = im.dataset.src; im.removeAttribute('data-src'); im.removeAttribute('data-srcset'); };
    var start = function () { clearInterval(tm); if (!bezRuchu && n > 1) tm = setInterval(function () { if (!d.hidden) idz(ak + 1); }, 6500); };
    var idz = function (k) {
      k = (k + n) % n; if (k === ak) return;
      var stary = sl[ak], nowy = sl[k];
      wczytaj(nowy); wczytaj(sl[(k + 1) % n]);
      clearTimeout(tw);
      [].forEach.call(sl, function (f) { if (f !== stary) f.classList.remove('wych', 'wchodzi'); });
      stary.classList.remove('akt', 'wchodzi'); stary.classList.add('wych');
      nowy.classList.add('akt', 'wchodzi');
      tw = setTimeout(function () { stary.classList.remove('wych'); nowy.classList.remove('wchodzi'); }, 1400);
      ak = k;
      for (var j = 0; j < kr.length; j++) kr[j].setAttribute('aria-current', j === ak ? 'true' : 'false');
      start();
    };
    [].forEach.call(kr, function (b, j) { b.addEventListener('click', function () { idz(j); }); });
    var x0 = null, y0 = 0;
    hero.addEventListener('pointerdown', function (e) { if (e.target.closest('a,button')) return; x0 = e.clientX; y0 = e.clientY; });
    hero.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0, dy = e.clientY - y0; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) idz(ak + (dx < 0 ? 1 : -1)); x0 = null; });
    hero.addEventListener('pointercancel', function () { x0 = null; });
    pk.addEventListener('dragstart', function (e) { e.preventDefault(); });
    /* kolejne zdjęcia wczytywane dopiero po załadowaniu strony (nie konkurują z pierwszym) */
    window.addEventListener('load', function () { if (!bezRuchu) pk.classList.add('gra'); setTimeout(function () { wczytaj(sl[1]); }, 1200); start(); });
  }

  /* płynne pojawianie się napisów i zdjęć przy przewijaniu: tylko elementy jeszcze poza ekranem (bez mrugania i przesunięć układu) */
  if (!bezRuchu && 'IntersectionObserver' in window) {
    var cele = d.querySelectorAll('main .sek .sep, main .wstep, .pokoj, .atut, .salon-foto, .salon > div, .okazja, .okazja-karta, .dzial-karta, .galeria, .dzial-opis > *, .producenci-blok, .nl-txt, .nl-form, .dwie > div, .pusta > div, .kontakt > *, .producenci, .okazje-linki, .sek-cta .wstep, .sek-cta .cta-rzad, .spis li');
    var pierwszy = new WeakMap();
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        var el = e.target;
        if (!pierwszy.has(el)) {
          pierwszy.set(el, 1);
          if (e.isIntersecting) { io.unobserve(el); return; }
          var i = 0, s = el; while ((s = s.previousElementSibling)) { if (s.classList.contains('ods')) i++; }
          el.style.setProperty('--d', Math.min(i, 6)); el.classList.add('ods');
          return;
        }
        if (e.isIntersecting) {
          io.unobserve(el); el.classList.add('widac');
          setTimeout(function () { el.classList.remove('ods', 'widac'); el.style.removeProperty('--d'); }, 1900);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    [].forEach.call(cele, function (el) { if (!el.closest('.hero')) io.observe(el); });
  }

  /* dolny pasek na telefonie: po przewinięciu za główny przycisk */
  var mob = d.getElementById('mob'), cel = d.querySelector('[data-cta]');
  if (mob && 'IntersectionObserver' in window) {
    var ustaw = function (w) { mob.classList.toggle('widac', w); mob.setAttribute('aria-hidden', w ? 'false' : 'true'); [].forEach.call(mob.querySelectorAll('a'), function (a) { a.tabIndex = w ? 0 : -1; }); };
    if (cel) new IntersectionObserver(function (en) { ustaw(!en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(cel);
    else ustaw(true);
    var stopka = d.querySelector('.stopka');
    if (stopka) new IntersectionObserver(function (en) { if (en[0].isIntersecting) ustaw(false); }).observe(stopka);
  }

  /* formularz zapytania */
  var f = d.getElementById('formularz'), info = d.getElementById('info-form');
  if (f) {
    var dz = (location.search.match(/[?&]temat=([^&]+)/) || [])[1];
    if (dz) { try { dz = decodeURIComponent(dz.replace(/\+/g, ' ')); var s = f.querySelector('[name="dzial"]'); [].forEach.call(s.options, function (o) { if (o.text === dz) s.value = o.value || o.text; }); } catch (err) {} }
    f.querySelector('[name="zrodlo"]').value = location.href.split('#')[0];
    var odsw = false;
    f.addEventListener('focusin', function () {
      if (odsw || !window.WB || !WB.ajax) return; odsw = true;
      fetch(WB.ajax + '?action=wb_token', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.t) f.querySelector('[name="t"]').value = j.t; }).catch(function () {});
    });
    var kom = function (t, k) { info.className = 'form-info' + (k ? ' ' + k : ''); info.textContent = t; };
    f.addEventListener('submit', function (e) {
      var im = f.querySelector('[name="imie"]'), tel = f.querySelector('[name="telefon"]'), em = f.querySelector('[name="email"]'), wi = f.querySelector('[name="wiad"]');
      if (!im.value.trim()) { e.preventDefault(); im.focus(); kom('Proszę wpisać imię.', 'blad'); return; }
      if (!tel.value.trim() && !em.value.trim()) { e.preventDefault(); tel.focus(); kom('Proszę podać telefon albo e-mail, żebyśmy mogli odpowiedzieć.', 'blad'); return; }
      if (em.value.trim() && !em.checkValidity()) { e.preventDefault(); em.focus(); kom('Proszę sprawdzić adres e-mail.', 'blad'); return; }
      if (!wi.value.trim()) { e.preventDefault(); wi.focus(); kom('Proszę napisać, czego szukasz.', 'blad'); return; }
      if (f.dataset.test) { e.preventDefault(); kom(f.dataset.test, 'ok'); return; }
      if (!window.fetch || !window.FormData || !window.WB || !WB.ajax) return;
      e.preventDefault();
      var b = f.querySelector('button[type="submit"]'); b.disabled = true; kom('Wysyłanie...', '');
      var dane = new FormData(f); dane.append('ajax', '1');
      fetch(WB.ajax, { method: 'POST', body: dane, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) { kom(j.msg || 'Dziękujemy.', j.ok ? 'ok' : 'blad'); if (j.ok) f.reset(); })
        .catch(function () { kom('Nie udało się wysłać zapytania. Proszę zadzwonić albo spróbować ponownie.', 'blad'); })
        .then(function () { b.disabled = false; });
    });
  }

  /* newsletter: zapis bez przeładowania strony, świeży znacznik czasu przy pierwszym kliknięciu */
  var nf = d.getElementById('nl-form'), ni = d.getElementById('nl-info');
  if (nf) {
    nf.querySelector('[name="zrodlo"]').value = location.href.split('#')[0];
    var nlKom = function (t) { ni.textContent = t; };
    nf.addEventListener('focusin', function () {
      if (nf.dataset.odsw || !window.WB || !WB.ajax) return; nf.dataset.odsw = '1';
      fetch(WB.ajax + '?action=wb_token', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.t) nf.querySelector('[name="t"]').value = j.t; }).catch(function () {});
    });
    nf.addEventListener('submit', function (e) {
      var em = nf.querySelector('[name="email"]'), zg = nf.querySelector('[name="zgoda"]');
      if (!em.value.trim() || !em.checkValidity()) { e.preventDefault(); em.focus(); nlKom('Proszę wpisać poprawny adres e-mail.'); return; }
      if (!zg.checked) { e.preventDefault(); zg.focus(); nlKom('Proszę zaznaczyć zgodę na informacje o promocjach.'); return; }
      if (nf.dataset.test) { e.preventDefault(); nlKom(nf.dataset.test); return; }
      if (!window.fetch || !window.FormData || !window.WB || !WB.ajax) return;
      e.preventDefault();
      var b = nf.querySelector('button[type="submit"]'); b.disabled = true; nlKom('Zapisywanie...');
      var dane = new FormData(nf); dane.append('ajax', '1');
      fetch(WB.ajax, { method: 'POST', body: dane, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) { nlKom(j.msg || 'Dziękujemy.'); if (j.ok) nf.reset(); })
        .catch(function () { nlKom('Nie udało się zapisać. Proszę spróbować ponownie.'); })
        .then(function () { b.disabled = false; });
    });
  }

  /* zgoda cookies (12 miesięcy), mapa Google przy przewinięciu, statystyki tylko po zgodzie */
  var ck = d.getElementById('cookies'), mapa = d.getElementById('mapa');
  function zgoda() { try { var z = JSON.parse(localStorage.getItem('wibo-zgoda') || 'null'); return z && z.t > Date.now() - 31536e6 ? z.v : null; } catch (err) { return null; } }
  function statystyki() {
    if (!window.WB || !WB.ga || window.gtag) return;
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + WB.ga; d.head.appendChild(s);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', WB.ga, { anonymize_ip: true });
  }
  function wlaczMape() {
    if (!mapa || mapa.querySelector('iframe')) return;
    var z = mapa.querySelector('.mapa-zastep'); if (z) z.hidden = true;
    var i = d.createElement('iframe');
    i.title = 'Mapa dojazdu: salon WIBO meble, Łuków'; i.src = mapa.getAttribute('data-src'); i.loading = 'lazy'; i.referrerPolicy = 'no-referrer-when-downgrade'; i.allowFullscreen = true;
    mapa.appendChild(i);
  }
  function stanMapy() { if (!mapa || mapa.querySelector('iframe')) return; if (zgoda() === 'nie') mapa.querySelector('.mapa-zastep').hidden = false; else wlaczMape(); }
  if (mapa) {
    var obserwuj = function () {
      if (obserwuj.raz) return; obserwuj.raz = 1;
      if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); stanMapy(); } }, { rootMargin: '300px 0px' }); io.observe(mapa); }
      else stanMapy();
    };
    /* mapa nie wczytuje się razem ze stroną: po pierwszym przewinięciu albo chwilę po załadowaniu */
    window.addEventListener('scroll', obserwuj, { passive: true, once: true });
    window.addEventListener('load', function () { setTimeout(obserwuj, 3000); });
    mapa.addEventListener('click', function (e) { if (e.target.closest('[data-mapa-pokaz]')) wlaczMape(); });
  }
  if (zgoda() === 'tak') statystyki();
  if (ck) {
    if (zgoda()) ck.hidden = true;
    ck.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zgoda]'); if (!b) return;
      var v = b.getAttribute('data-zgoda');
      try { localStorage.setItem('wibo-zgoda', JSON.stringify({ v: v, t: Date.now() })); } catch (err) {}
      ck.hidden = true;
      if (v === 'tak') { statystyki(); var mz = mapa && mapa.querySelector('.mapa-zastep'); if (mz && !mz.hidden) wlaczMape(); }
    });
    [].forEach.call(d.querySelectorAll('[data-cookies-ustawienia]'), function (b) { b.addEventListener('click', function () { ck.hidden = false; ck.querySelector('button').focus(); }); });
  }
})();
