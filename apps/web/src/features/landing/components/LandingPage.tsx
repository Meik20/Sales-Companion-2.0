import '../styles/landing.css'
import { useTranslation } from '@/providers/I18nProvider'
import { useEffect } from 'react'
import { ScIcon } from '@/components/ui/ScIcon'

export function LandingPage() {
  const { t, lang, setLang } = useTranslation()

  useEffect(() => {
    /* ─── Navigation sticky scroll effect ──────────────────────────────────── */
    const nav = document.getElementById('nav');
    function onScroll() {
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ─── Mobile nav toggle ─────────────────────────────────────────────────── */
    const toggle = document.getElementById('nav-toggle');
    const navEl   = document.getElementById('nav');
    if (toggle && navEl) {
      toggle.addEventListener('click', function () {
        const open = navEl.classList.toggle('nav-mobile-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? '✕' : '☰';
        toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      });

      /* Fermer le menu mobile au clic sur un lien */
      document.querySelectorAll('.nav-links a, .nav-cta a').forEach(function (link) {
        link.addEventListener('click', function () {
          navEl.classList.remove('nav-mobile-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '☰';
        });
      });
    }

    /* ─── Scroll reveal (IntersectionObserver) ──────────────────────────────── */
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      /* Fallback sans IO */
      revealEls.forEach(function (el) { el.classList.add('visible'); });
    }

    /* ─── ScIcon interactif — clic logo nav ─────────────────────────────────── */
    const navIcon = document.getElementById('nav-icon');
    if (navIcon) {
      navIcon.addEventListener('click', function () {
        navIcon.style.transform = 'scale(0.88) rotate(-8deg)';
        setTimeout(function () {
          navIcon.style.transform = 'scale(1) rotate(0deg)';
        }, 300);
      });
    }

    /* ─── Smooth scroll ancres ───────────────────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = anchor.getAttribute('href')?.slice(1);
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        const offset = 68; /* hauteur nav */
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });

    // Générer le QR Code avec une API fiable (api.qrserver.com)
    const appUrl = window.location.protocol + '//' + window.location.host + '/search';
    const qrImg = document.getElementById('qr-code-img') as HTMLImageElement;
    const qrSvg = document.getElementById('qr-code');
    if (qrImg && qrSvg) {
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(appUrl);
      qrImg.style.display = 'block';
      qrSvg.style.display = 'none';
    }

    /* ─── PWA Install Prompt ────────────────────────────────────────────────── */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deferredPrompt: any = null;
    const installBtn = document.getElementById('install-pwa-btn');
    const installBtnBanner = document.getElementById('install-pwa-btn-banner');
    
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button
      if (installBtn) installBtn.style.display = 'inline-flex';
      if (installBtnBanner) installBtnBanner.classList.remove('hidden');
    });

    // Handle install button click
    function handleInstallClick() {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choiceResult: any) {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA installed');
        }
        deferredPrompt = null;
        if (installBtn) installBtn.style.display = 'none';
        if (installBtnBanner) installBtnBanner.classList.add('hidden');
      });
    }

    if (installBtn) {
      installBtn.addEventListener('click', handleInstallClick);
    }
    if (installBtnBanner) {
      installBtnBanner.addEventListener('click', handleInstallClick);
    }

  }, [])

  return (
    <div className="landing-root">
      

{/*  ═══════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════  */}
<nav className="nav" id="nav" role="navigation" aria-label="Navigation principale">
  <div className="nav-inner">
    {/*  Brand avec ScIcon interactif  */}
    <a href="/" className="nav-brand" aria-label="Sales Companion 2.0 — Accueil">
      {/*  ScIcon SVG  */}
      <ScIcon size={32} interactive className="sc-icon interactive" id="nav-icon" />
      <span className="nav-brand-text">Sales <em>Companion 2.0</em></span>
    </a>

    {/*  Desktop nav  */}
    <div className="nav-desktop" id="nav-desktop">
      <ul className="nav-links" role="list">
        <li><a href="#features">{t('landing.features')}</a></li>
        <li><a href="#roles">{t('landing.roles')}</a></li>
        <li><a href="#plans">{t('landing.pricing')}</a></li>
        <li><a href="#testimonials">{t('landing.testimonials')}</a></li>
        <li><a href="#privacy">Confidentialité</a></li>
      </ul>
      <div className="nav-cta">
        <button
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="btn btn-ghost btn-sm"
          style={{ padding: '6px 10px', minWidth: 40, border: 'none' }}
          aria-label="Changer de langue"
        >
          {lang === 'fr' ? '🇺🇸 EN' : '🇫🇷 FR'}
        </button>
        <a href="/login" className="btn btn-ghost btn-sm">{t('landing.login')}</a>
        <a href="/register" className="btn btn-primary btn-sm">{t('landing.startFree')}</a>
      </div>
    </div>

    {/*  Mobile toggle  */}
    <button className="nav-mobile-toggle" id="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-desktop">
      ☰
    </button>
  </div>
</nav>


{/*  ═══════════════════════════════════════════════════
     HERO
     ═══════════════════════════════════════════════════  */}
<section className="hero" id="hero">
  <div className="hero-glow-tl" aria-hidden="true"></div>
  <div className="hero-glow-br" aria-hidden="true"></div>

  <h1 className="hero-title">
    {t('landing.heroTitle1')}<br />
    {t('landing.heroTitle2')} <em>{t('landing.heroTitle3')}</em>{t('landing.heroTitle3') ? ',' : ''}<br />
    {t('landing.heroTitle4')} <em>{t('landing.heroTitle5')}</em>
  </h1>

  <p className="hero-sub">
    {t('landing.heroSub')}
  </p>

  <div className="hero-actions">
    <a href="/register" className="btn btn-primary btn-xl">
      {t('landing.startFree')}
    </a>
    <a href="#features" className="btn btn-ghost btn-xl">
      {t('landing.discoverFeatures')}
    </a>
    <button id="install-pwa-btn" className="btn btn-primary btn-xl" style={{"display":"none","gap":"8px"}}>
      📱 {t('landing.installApp')}
    </button>
  </div>

  <p className="hero-trust">
    <span className="hero-trust-dot" aria-hidden="true"></span>
    {t('landing.freeToStart')}
    <span className="hero-trust-dot" aria-hidden="true"></span>
    {t('landing.noCardRequired')}
    <span className="hero-trust-dot" aria-hidden="true"></span>
    {t('landing.officialDatabase')}
  </p>

  {/*  Phone mockup PWA  */}
  <div className="mockup-wrap" aria-label="Aperçu de l'application mobile" role="img" style={{"marginTop":"56px"}}>
    <div className="mockup">
      <div className="mockup-bar">
        <span>9:41</span>
        <div className="mockup-notch"><div className="mockup-notch-dot"></div></div>
        <span>●●●</span>
      </div>
      <div className="mockup-screen">
        {/*  App header  */}
        <div className="mockup-header">
          <svg width="18" height="18" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M0 0 C20 0 57 0 57 0 C57 0 199 0 199 57 C199 115 199 199 142 199 C84 199 0 199 0 199 C0 199 -57 199 -57 142 C-57 84 -57 0 0 0 Z" fill="#1B7A3E" transform="translate(57,0.5)"/>
            <path d="M0 0 C7 6 12 11 12 24 C4 25 -3 25 -9 25 C-11 18 -13 16 -16 13 C-19 11 -26 12 -41 15 C-43 18 -43 23 -43 23 C-38 30 -27 32 -19 33 C-8 36 4 39 10 49 C15 57 16 65 14 74 C12 82 8 88 0 93 C-8 97 -16 97 -25 97 C-39 97 -48 95 -56 88 C-63 81 -66 73 -66 63 C-60 62 -47 61 -47 61 C-43 72 -41 75 -36 78 C-30 80 -20 80 -14 78 C-7 71 -7 62 -7 62 C-11 57 -17 56 -24 55 C-44 49 -54 45 -60 35 C-64 28 -64 22 -62 15 C-60 8 -56 2 -49 -2 C-35 -8 -13 -9 0 0 Z" fill="#FBFCFB" transform="translate(105,124)"/>
            <path d="M0 0 C6 5 10 11 12 18 C12 21 12 21 -8 26 C-12 17 -14 14 -21 11 C-28 9 -35 9 -41 12 C-48 18 -53 33 -53 33 C-54 46 -47 69 -47 69 C-39 76 -33 77 -33 77 C-20 76 -14 71 -14 71 C-9 62 -7 57 -7 57 C-1 58 12 63 12 63 C6 82 -3 88 -3 88 C-27 96 -40 95 -40 95 C-60 85 -67 76 -67 76 C-77 42 -73 25 -73 25 C-62 3 -51 -4 -51 -4 C-35 -12 -14 -10 0 0 Z" fill="#FBFCFC" transform="translate(203,126)"/>
          </svg>
          <span className="mockup-header-text" style={{"color":"var(--gm)"}}>Sales Companion 2.0</span>
          <span style={{"fontSize":"10px","color":"var(--tx3)","marginLeft":"auto"}}>Recherche</span>
        </div>
        {/*  Barre de recherche  */}
        <div className="mockup-search">
          <span style={{"fontSize":"11px"}}>🔍</span>
          <span>Entreprise, secteur, ville…</span>
        </div>
        {/*  Résultat 1  */}
        <div className="mockup-result">
          <div className="mockup-result-name">CamTech Solutions SARL</div>
          <div className="mockup-result-meta">
            <span>📍 Douala</span>
            <span className="mockup-result-badge">Tech & Numérique</span>
          </div>
        </div>
        {/*  Résultat 2  */}
        <div className="mockup-result">
          <div className="mockup-result-name">BÂTI-PLUS Construction</div>
          <div className="mockup-result-meta">
            <span>📍 Yaoundé</span>
            <span className="mockup-result-badge">BTP</span>
          </div>
        </div>
        {/*  Pipeline mini  */}
        <div className="mockup-result" style={{"background":"rgba(27,122,62,0.08)","borderColor":"rgba(27,122,62,0.2)"}}>
          <div className="mockup-pip-bar">
            <div>
              <div className="mockup-result-name" style={{"color":"var(--gm)"}}>Pipeline</div>
              <div className="mockup-result-meta"><span>3 prospects actifs</span></div>
            </div>
            <div className="mockup-pip-count">3</div>
          </div>
        </div>
        {/*  Bottom nav  */}
        <div className="mockup-nav" role="navigation" aria-label="Navigation application">
          <div className="mockup-nav-item active" aria-current="page">
            <span className="mockup-nav-icon">🔍</span>
            Recherche
          </div>
          <div className="mockup-nav-item">
            <span className="mockup-nav-icon">📊</span>
            Pipeline
          </div>
          <div className="mockup-nav-item">
            <span className="mockup-nav-icon">🔖</span>
            Sauvegardés
          </div>
          <div className="mockup-nav-item">
            <span className="mockup-nav-icon">👤</span>
            Profil
          </div>
        </div>
      </div>
    </div>
  </div>

  {/*  PWA Install Banner with QR Code  */}
  <div className="pwa-install-banner" id="pwa-install-banner">
    <div className="pwa-install-qr">
      <svg 
        className="pwa-install-qr-code" 
        id="qr-code" 
        viewBox="0 0 41 41" 
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t('landing.pwaBanner.qrAria')}
      >
        {/*  L'image remplacera le SVG  */}
      </svg>
      <img id="qr-code-img" src="" alt="QR Code" width="120" height="120" style={{"display":"none","borderRadius":"4px","background":"#fff","border":"1px solid var(--bd)","padding":"8px"}} />
      <span className="pwa-install-qr-label">{t('landing.pwaBanner.scanToInstall')}</span>
    </div>
    
    <div className="pwa-install-content">
      <div className="pwa-install-title">📱 {t('landing.pwaBanner.title')}</div>
      <p className="pwa-install-desc">
        {t('landing.pwaBanner.desc')}
      </p>
      <div className="pwa-install-actions">
        <button id="install-pwa-btn-banner" className="btn-install-pwa hidden" aria-label={t('landing.pwaBanner.installAria')}>
          ⬇️ {t('landing.pwaBanner.installBtn')}
        </button>
        <a href="/register" className="btn-install-pwa" style={{"textDecoration":"none","background":"var(--dark3)","border":"1px solid var(--bd)"}}>
          🚀 {t('landing.pwaBanner.startBtn')}
        </a>
      </div>
    </div>
  </div>
</section>


{/*  ═══════════════════════════════════════════════════
     STATS BANNER
     ═══════════════════════════════════════════════════  */}
<div className="stats-banner" role="region" aria-label="Statistiques de la plateforme">
  <div className="container">
    <div className="stats-grid">
      <div className="stat-item reveal">
        <div className="stat-value" data-target="500000" aria-label="500K plus entreprises">500K +</div>
        <div className="stat-label">{t("landing.stats.indexed")}</div>
      </div>
      <div className="stat-item reveal reveal-d1">
        <div className="stat-value" aria-label="10 régions">10</div>
        <div className="stat-label">{t("landing.stats.regions")}</div>
      </div>
      <div className="stat-item reveal reveal-d2">
        <div className="stat-value" aria-label="12 secteurs">12</div>
        <div className="stat-label">{t("landing.stats.sectors")}</div>
      </div>
      <div className="stat-item reveal reveal-d3">
        <div className="stat-value" aria-label="100% offline">100%</div>
        <div className="stat-label">{t("landing.stats.offline")}</div>
      </div>
    </div>
  </div>
</div>


{/*  ═══════════════════════════════════════════════════
     FONCTIONNALITÉS
     ═══════════════════════════════════════════════════  */}
<section className="section" id="features" aria-labelledby="features-title">
  <div className="container">
    <header className="section-header reveal">
      <span className="section-label">{t("landing.features")}</span>
      <h2 className="section-title" id="features-title">
        {t("landing.featuresSection.title1")}<br />{t("landing.featuresSection.title2")} <em>{t("landing.featuresSection.title3")}</em>
      </h2>
      <p className="section-sub">
        {t("landing.featuresSection.sub")}
      </p>
    </header>

    <div className="features-grid" role="list">
      <article className="feature-card reveal" role="listitem">
        <div className="feature-icon" aria-hidden="true">🔍</div>
        <h3 className="feature-title">{t("landing.featuresSection.f1Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f1Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f1Tag")}</p>
      </article>

      <article className="feature-card reveal reveal-d1" role="listitem">
        <div className="feature-icon" aria-hidden="true">📊</div>
        <h3 className="feature-title">{t("landing.featuresSection.f2Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f2Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f2Tag")}</p>
      </article>

      <article className="feature-card reveal reveal-d2" role="listitem">
        <div className="feature-icon" aria-hidden="true">👥</div>
        <h3 className="feature-title">{t("landing.featuresSection.f3Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f3Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f3Tag")}</p>
      </article>

      <article className="feature-card reveal" role="listitem">
        <div className="feature-icon" aria-hidden="true">🤖</div>
        <h3 className="feature-title">{t("landing.featuresSection.f4Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f4Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f4Tag")}</p>
      </article>

      <article className="feature-card reveal reveal-d1" role="listitem">
        <div className="feature-icon" aria-hidden="true">🔖</div>
        <h3 className="feature-title">{t("landing.featuresSection.f5Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f5Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f5Tag")}</p>
      </article>

      <article className="feature-card reveal reveal-d2" role="listitem">
        <div className="feature-icon" aria-hidden="true">📱</div>
        <h3 className="feature-title">{t("landing.featuresSection.f6Title")}</h3>
        <p className="feature-desc">
          {t("landing.featuresSection.f6Desc")}
        </p>
        <p className="feature-tag">{t("landing.featuresSection.f6Tag")}</p>
      </article>
    </div>
  </div>
</section>


<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     PROFILS / RÔLES
     ═══════════════════════════════════════════════════  */}
<section className="section" id="roles" aria-labelledby="roles-title">
  <div className="container">
    <header className="section-header reveal">
      <span className="section-label">{t("landing.roles")}</span>
      <h2 className="section-title" id="roles-title">
        {t("landing.rolesSection.title1")} <em>{t("landing.rolesSection.title2")}</em><br />{t("landing.rolesSection.title3")}
      </h2>
      <p className="section-sub">
        {t("landing.rolesSection.sub")}
      </p>
    </header>

    <div className="roles-grid">

      <article className="role-card reveal">
        <div className="role-card-accent" style={{"background":"linear-gradient(90deg, #1B7A3E, #2ea05a)"}} aria-hidden="true"></div>
        <span className="role-icon" aria-hidden="true">🧳</span>
        <h3 className="role-title">{t("landing.rolesSection.indepTitle")}</h3>
        <p className="role-desc">
          {t("landing.rolesSection.indepDesc")}
        </p>
        <ul className="role-perks" role="list">
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true"></span>
            {t("landing.rolesSection.indepPerk1")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true"></span>
            {t("landing.rolesSection.indepPerk2")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true"></span>
            {t("landing.rolesSection.indepPerk3")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true"></span>
            {t("landing.rolesSection.indepPerk4")}
          </li>
        </ul>
      </article>

      <article className="role-card reveal reveal-d1">
        <div className="role-card-accent" style={{"background":"linear-gradient(90deg, #F5A623, #c8841a)"}} aria-hidden="true"></div>
        <span className="role-icon" aria-hidden="true">📋</span>
        <h3 className="role-title">{t("landing.rolesSection.mgrTitle")}</h3>
        <p className="role-desc">
          {t("landing.rolesSection.mgrDesc")}
        </p>
        <ul className="role-perks" role="list">
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true" style={{"background":"var(--gold)"}}></span>
            {t("landing.rolesSection.mgrPerk1")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true" style={{"background":"var(--gold)"}}></span>
            {t("landing.rolesSection.mgrPerk2")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true" style={{"background":"var(--gold)"}}></span>
            {t("landing.rolesSection.mgrPerk3")}
          </li>
          <li className="role-perk" role="listitem">
            <span className="role-perk-dot" aria-hidden="true" style={{"background":"var(--gold)"}}></span>
            {t("landing.rolesSection.mgrPerk4")}
          </li>
        </ul>
      </article>

    </div>
  </div>
</section>


<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     PLANS TARIFAIRES
     ═══════════════════════════════════════════════════  */}
<section className="section" id="plans" aria-labelledby="plans-title">
  <div className="container">
    <header className="section-header reveal">
      <span className="section-label">{t("landing.pricing")}</span>
      <h2 className="section-title" id="plans-title">
        {t("landing.plansSection.title1")} <em>{t("landing.plansSection.title2")}</em><br />{t("landing.plansSection.title3")}
      </h2>
      <p className="section-sub">
        {t("landing.plansSection.sub")}
      </p>
    </header>

    <div className="plans-grid">

      {/*  Gratuit  */}
      <article className="plan-card reveal" aria-label="Plan Gratuit">
        <div className="plan-name">{t("landing.plansSection.free")}</div>
        <span className="badge badge-default">{t("landing.plansSection.freeBadge")}</span>
        <div className="plan-price">0 <sub>FCFA</sub></div>
        <div className="plan-period">{t("landing.plansSection.freePeriod")}</div>
        <div className="plan-divider" aria-hidden="true"></div>
        <ul className="plan-features" role="list">
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pFree1")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pFree2")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pFree3")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pFree4")}
          </li>
          <li className="plan-feature" role="listitem" style={{"opacity":0.45}}>
            <span style={{"color":"var(--tx3)"}} aria-hidden="true">✗</span>
            <span style={{color:"var(--tx3)"}}>Companion IA</span>
          </li>
          <li className="plan-feature" role="listitem" style={{"opacity":0.45}}>
            <span style={{"color":"var(--tx3)"}} aria-hidden="true">✗</span>
            <span style={{"color":"var(--tx3)"}}>Gestion équipe</span>
          </li>
        </ul>
        <a href="/register" className="btn btn-outline btn-md" style={{"width":"100%","justifyContent":"center"}} aria-label="Démarrer avec le plan Gratuit">
          {t("landing.plansSection.startFreeBtn")}
        </a>
      </article>

      {/*  Pro — featured  */}
      <article className="plan-card featured reveal reveal-d1" aria-label="Plan Pro — Recommandé">
        <div className="plan-featured-label" aria-label="Plan recommandé">{t("landing.plansSection.recommended")}</div>
        <div className="plan-name">{t("landing.plansSection.pro")}</div>
        <span className="badge badge-success">{t("landing.plansSection.proBadge")}</span>
        <div className="plan-price">{t("landing.plansSection.proPrice")} <sub>FCFA</sub></div>
        <div className="plan-period">{t("landing.plansSection.proPeriod")}</div>
        <div className="plan-divider" aria-hidden="true"></div>
        <ul className="plan-features" role="list">
          <li className="plan-feature" role="listitem">
            <strong>200</strong> {t("landing.plansSection.pPro1")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pPro2")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pPro3")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.rolesSection.indepPerk4")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.rolesSection.indepPerk3")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pPro6")}
          </li>
        </ul>
        <a href="/register" className="btn btn-primary btn-md" style={{"width":"100%","justifyContent":"center"}} aria-label="Commencer avec le plan Pro">
          {t("landing.plansSection.chooseProBtn")}
        </a>
      </article>

      {/*  Team  */}
      <article className="plan-card reveal reveal-d2" aria-label="Plan Team">
        <div className="plan-name">{t("landing.plansSection.team")}</div>
        <span className="badge badge-gold">{t("landing.plansSection.teamBadge")}</span>
        <div className="plan-price">{t("landing.plansSection.teamPrice")} <sub>FCFA</sub></div>
        <div className="plan-period">{t("landing.plansSection.proPeriod")}</div>
        <div className="plan-divider" aria-hidden="true"></div>
        <ul className="plan-features" role="list">
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam1")} <strong>{t("landing.plansSection.pTeam1b")}</strong>
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam2")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam3")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam4")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam5")}
          </li>
          <li className="plan-feature" role="listitem">
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            {t("landing.plansSection.pTeam6")}
          </li>
        </ul>
        <a href="/register" className="btn btn-ghost btn-md" style={{"width":"100%","justifyContent":"center"}} aria-label="Démarrer avec le plan Team">
          {t("landing.plansSection.contactTeamBtn")}
        </a>
      </article>

    </div>
  </div>
</section>


<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     CAS D'USAGE (USE CASES)
     ═══════════════════════════════════════════════════  */}
<section className="section-sm" id="use-cases" aria-labelledby="use-cases-title">
  <div className="container">
    <header className="section-header reveal">
      <h2 className="section-title" id="use-cases-title">
        {t("landing.useCasesSection.title1")} <em>{t("landing.useCasesSection.title2")}</em> {t("landing.useCasesSection.title3")}
      </h2>
      <p className="section-sub">
        {t("landing.useCasesSection.sub")}
      </p>
    </header>

    <div className="features-grid">
      <article className="feature-card reveal" aria-label={t("landing.useCasesSection.uc1Title")}>
        <div className="feature-icon" aria-hidden="true" style={{ background: 'var(--color-primary)' }}>🏢</div>
        <h3>{t("landing.useCasesSection.uc1Title")}</h3>
        <p>{t("landing.useCasesSection.uc1Desc")}</p>
      </article>

      <article className="feature-card reveal reveal-d1" aria-label={t("landing.useCasesSection.uc2Title")}>
        <div className="feature-icon" aria-hidden="true" style={{ background: 'var(--color-accent)' }}>💻</div>
        <h3>{t("landing.useCasesSection.uc2Title")}</h3>
        <p>{t("landing.useCasesSection.uc2Desc")}</p>
      </article>

      <article className="feature-card reveal reveal-d2" aria-label={t("landing.useCasesSection.uc3Title")}>
        <div className="feature-icon" aria-hidden="true" style={{ background: 'var(--color-secondary)' }}>🏦</div>
        <h3>{t("landing.useCasesSection.uc3Title")}</h3>
        <p>{t("landing.useCasesSection.uc3Desc")}</p>
      </article>
    </div>
  </div>
</section>

<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     FAQ (FOIRE AUX QUESTIONS)
     ═══════════════════════════════════════════════════  */}
<section className="section-sm" id="faq" aria-labelledby="faq-title">
  <div className="container">
    <header className="section-header reveal">
      <h2 className="section-title" id="faq-title">
        {t("landing.faqSection.title1")} <em>{t("landing.faqSection.title2")}</em> {t("landing.faqSection.title3")}
      </h2>
      <p className="section-sub">
        {t("landing.faqSection.sub")}
      </p>
    </header>

    <div className="faq-list" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <article className="feature-card reveal" style={{ padding: '20px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--tx)' }}>{t("landing.faqSection.q1")}</h3>
        <p style={{ color: 'var(--tx2)', fontSize: '15px', margin: 0 }}>{t("landing.faqSection.a1")}</p>
      </article>
      <article className="feature-card reveal reveal-d1" style={{ padding: '20px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--tx)' }}>{t("landing.faqSection.q2")}</h3>
        <p style={{ color: 'var(--tx2)', fontSize: '15px', margin: 0 }}>{t("landing.faqSection.a2")}</p>
      </article>
      <article className="feature-card reveal reveal-d2" style={{ padding: '20px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--tx)' }}>{t("landing.faqSection.q3")}</h3>
        <p style={{ color: 'var(--tx2)', fontSize: '15px', margin: 0 }}>{t("landing.faqSection.a3")}</p>
      </article>
      <article className="feature-card reveal reveal-d3" style={{ padding: '20px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--tx)' }}>{t("landing.faqSection.q4")}</h3>
        <p style={{ color: 'var(--tx2)', fontSize: '15px', margin: 0 }}>{t("landing.faqSection.a4")}</p>
      </article>
    </div>
  </div>
</section>

<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     TÉMOIGNAGES
     ═══════════════════════════════════════════════════  */}
<section className="section-sm" id="testimonials" aria-labelledby="testimonials-title">
  <div className="container">
    <header className="section-header reveal">
      <span className="section-label">{t("landing.testimonials")}</span>
      <h2 className="section-title" id="testimonials-title">
        {t("landing.testiSection.title1")}<br />{t("landing.testiSection.title2")} <em>{t("landing.testiSection.title3")}</em>
      </h2>
    </header>

    <div className="testimonials-grid">

      <article className="testimonial-card reveal" aria-label="Témoignage de Thierry N.">
        <div className="testimonial-stars" aria-label="5 étoiles sur 5">★★★★★</div>
        <blockquote className="testimonial-text">
          {t("landing.testiSection.t1Text")}
        </blockquote>
        <footer className="testimonial-author">
          <div className="testimonial-avatar" style={{"background":"var(--g)"}} aria-hidden="true">T</div>
          <div>
            <div className="testimonial-name">Thierry N.</div>
            <div className="testimonial-role">{t("landing.testiSection.t1Role")}</div>
          </div>
        </footer>
      </article>

      <article className="testimonial-card reveal reveal-d1" aria-label="Témoignage de Marcelline K.">
        <div className="testimonial-stars" aria-label="5 étoiles sur 5">★★★★★</div>
        <blockquote className="testimonial-text">
          {t("landing.testiSection.t2Text")}
        </blockquote>
        <footer className="testimonial-author">
          <div className="testimonial-avatar" style={{"background":"#764ba2"}} aria-hidden="true">M</div>
          <div>
            <div className="testimonial-name">Marcelline K.</div>
            <div className="testimonial-role">{t("landing.testiSection.t2Role")}</div>
          </div>
        </footer>
      </article>

      <article className="testimonial-card reveal reveal-d2" aria-label="Témoignage de Pascal A.">
        <div className="testimonial-stars" aria-label="5 étoiles sur 5">★★★★★</div>
        <blockquote className="testimonial-text">
          {t("landing.testiSection.t3Text")}
        </blockquote>
        <footer className="testimonial-author">
          <div className="testimonial-avatar" style={{"background":"#0891b2"}} aria-hidden="true">P</div>
          <div>
            <div className="testimonial-name">Pascal A.</div>
            <div className="testimonial-role">{t("landing.testiSection.t3Role")}</div>
          </div>
        </footer>
      </article>

    </div>
  </div>
</section>

<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     DONNÉES & CONFIDENTIALITÉ
     ═══════════════════════════════════════════════════  */}
<section className="section-sm" id="privacy" aria-labelledby="privacy-title">
  <div className="container">
    <header className="section-header reveal">
      <span className="section-label">{t('landing.privacy.label')}</span>
      <h2 className="section-title" id="privacy-title">
        {t('landing.privacy.title')}<em>{t('landing.privacy.titleHighlight')}</em>
      </h2>
      <p className="section-sub">
        {t('landing.privacy.subtitle')}
      </p>
    </header>

    <div className="features-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>

      {/* Ce que nous collectons */}
      <article className="feature-card reveal" style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }} aria-hidden="true">📋</div>
        <h3 className="feature-title">{t('landing.privacy.collected.title')}</h3>
        <ul style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: 0, listStyle: 'none' }}>
          {[
            t('landing.privacy.collected.item1'),
            t('landing.privacy.collected.item2'),
            t('landing.privacy.collected.item3'),
            t('landing.privacy.collected.item4'),
            t('landing.privacy.collected.item5'),
          ].map((item) => (
            <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--tx2)' }}>
              <span style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </article>

      {/* Finalités */}
      <article className="feature-card reveal reveal-d1" style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }} aria-hidden="true">🎯</div>
        <h3 className="feature-title">{t('landing.privacy.purposes.title')}</h3>
        <ul style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: 0, listStyle: 'none' }}>
          {[
            t('landing.privacy.purposes.item1'),
            t('landing.privacy.purposes.item2'),
            t('landing.privacy.purposes.item3'),
            t('landing.privacy.purposes.item4'),
            t('landing.privacy.purposes.item5'),
          ].map((item) => (
            <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--tx2)' }}>
              <span style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}>→</span>
              {item}
            </li>
          ))}
        </ul>
      </article>

      {/* Vos droits */}
      <article className="feature-card reveal reveal-d2" style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }} aria-hidden="true">🛡️</div>
        <h3 className="feature-title">{t('landing.privacy.rights.title')}</h3>
        <ul style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: 0, listStyle: 'none' }}>
          {[
            t('landing.privacy.rights.item1'),
            t('landing.privacy.rights.item2'),
            t('landing.privacy.rights.item3'),
            t('landing.privacy.rights.item4'),
            t('landing.privacy.rights.item5'),
          ].map((item) => (
            <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--tx2)' }}>
              <span style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </article>

    </div>

    {/* Engagements sécurité — fond bleu foncé avec texte blanc explicite */}
    <div className="reveal" style={{
      marginTop: '40px',
      background: '#004182',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '28px 32px',
      maxWidth: '800px',
      margin: '40px auto 0',
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🔒 {t('landing.privacy.security.title')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { icon: '🔐', title: t('landing.privacy.security.tls.title'), desc: t('landing.privacy.security.tls.desc') },
          { icon: '🏦', title: t('landing.privacy.security.firebase.title'), desc: t('landing.privacy.security.firebase.desc') },
          { icon: '🚫', title: t('landing.privacy.security.resale.title'), desc: t('landing.privacy.security.resale.desc') },
          { icon: '📍', title: t('landing.privacy.security.hosting.title'), desc: t('landing.privacy.security.hosting.desc') },
        ].map((item) => (
          <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
        {t('landing.privacy.security.contactText')}
      </p>
    </div>

  </div>
</section>

<div className="section-divider" aria-hidden="true"></div>


{/*  ═══════════════════════════════════════════════════
     CTA FINAL
     ═══════════════════════════════════════════════════  */}
<section className="section-sm" aria-labelledby="cta-title">
  <div className="container">
    <div className="cta-section reveal">
      <div className="cta-glow" aria-hidden="true"></div>
      <h2 className="cta-title" id="cta-title">
        {t("landing.ctaSection.title1")}<br />{t("landing.ctaSection.title2")} <em>{t("landing.ctaSection.title3")}</em> {t("landing.ctaSection.title4")}
      </h2>
      <p className="cta-sub">
        {t("landing.ctaSection.sub")}
      </p>
      <div style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"14px","flexWrap":"wrap"}}>
        <a href="/register" className="btn btn-primary btn-xl">
          {t("landing.ctaSection.createAccount")}
        </a>
        <a href="/login" className="btn btn-ghost btn-xl">
          {t("landing.ctaSection.login")}
        </a>
      </div>
      <p style={{"marginTop":"20px","fontSize":"12px","color":"var(--tx3)"}}>
        {t("landing.ctaSection.note")}
      </p>
    </div>
  </div>
</section>


{/*  ═══════════════════════════════════════════════════
     FOOTER
     ═══════════════════════════════════════════════════  */}
<footer className="footer" role="contentinfo">
  <div className="footer-inner">
    <div className="footer-top">

      {/*  Brand  */}
      <div className="footer-brand">
        <div className="footer-brand-name">
          {/*  ScIcon petite taille  */}
          <ScIcon size={22} className="sc-icon" />
          Sales <em>Companion</em>
        </div>
        <p className="footer-brand-desc">
          {t("landing.footer.desc")}
        </p>
        <p style={{"marginTop":"12px","fontSize":"12px","color":"var(--tx3)"}}>
          {t("landing.footer.madeIn")}
        </p>
      </div>

      {/*  Liens  */}
      <div className="footer-cols">
        <nav className="footer-col" aria-label="Liens produit">
          <h4>{t("landing.footer.product")}</h4>
          <ul role="list">
            <li><a href="#features">Fonctionnalités</a></li>
            <li><a href="#plans">Tarifs</a></li>
            <li><a href="#roles">Profils</a></li>
            <li><a href="/register">Commencer</a></li>
          </ul>
        </nav>
        <nav className="footer-col" aria-label="Liens application">
          <h4>{t("landing.footer.app")}</h4>
          <ul role="list">
            <li><a href="/login">Connexion</a></li>
            <li><a href="/register">Inscription</a></li>
            <li><a href="/login">{t("landing.footer.search")}</a></li>
            <li><a href="/login">{t("landing.footer.pipeline")}</a></li>
          </ul>
        </nav>
        <nav className="footer-col" aria-label="Liens support">
          <h4>{t("landing.footer.support")}</h4>
          <ul role="list">
            <li><a href="/login">{t("landing.footer.assistance")}</a></li>
            <li><a href="/login">{t("landing.footer.account")}</a></li>
            <li><a href="#privacy">Confidentialité des données</a></li>
          </ul>
        </nav>
        <nav className="footer-col" aria-label="Réseaux sociaux">
          <h4>Social</h4>
          <ul role="list">
            <li>
              <a href="https://www.linkedin.com/company/121514112" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                LinkedIn
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div className="footer-bottom">
      <span>© 2025 Sales Companion 2.0. {t("landing.footer.rights")}</span>
      <span>
        <span className="footer-flag" aria-label="Drapeau Cameroun">🇨🇲</span>
        Intelligence B2B Cameroun
      </span>
    </div>
  </div>
</footer>


{/*  ═══════════════════════════════════════════════════
     JAVASCRIPT
     ═══════════════════════════════════════════════════  */}
{/* Script moved to useEffect */}


    </div>
  )
}
