import '../styles/landing.css'
import { useTranslation } from '@/providers/I18nProvider'
import { useEffect } from 'react'

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
    <a href="/" className="nav-brand" aria-label="Sales Companion — Accueil">
      {/*  ScIcon SVG inline interactif (comme ScIcon.tsx)  */}
      <svg
        className="sc-icon interactive"
        width="32" height="32"
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Sales Companion"
        id="nav-icon"
      >
        <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C127.37715356 256.84567825 122.74064493 256.83996081 118.85917783 256.83685939 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C64.75196458 256.85268979 55.32364285 256.87949413 47.20610312 256.90170134 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)"/>
        <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C12.05078125 24.01171875 12.05078125 24.01171875 7.61292515 25.12337107 C3.28121739 25.12699638 -1.26171875 25.07421875 -8.94921875 25.01171875 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.50078828 19.24266032 -42.94921875 23.01171875 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C16.41880807 64.65954326 14.4375 73.859375 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-65.94921875 72.90375619 -65.94921875 63.01171875 -65.94921875 63.01171875 C-53.40921875 61.69171875 -46.94921875 61.01171875 -46.94921875 61.01171875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-6.94921875 71.01171875 -6.94921875 62.01171875 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-64.00700516 21.65784213 -62.44140625 14.78125 -62.44140625 14.78125 C-55.98988318 1.82376963 -49.3515625 -1.921875 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,123.98828125)"/>
        <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 20.765625 12 20.765625 -8 25.765625 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-51.72431369 24.40652263 -53 32.765625 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-39.11209193 76.29704298 -33.25 77.1796875 -33.25 77.1796875 C-19.81274293 76.38213005 -14.3125 71.265625 -14.3125 71.265625 C-9.08406112 61.749635 -7 56.765625 -7 56.765625 C-0.45044429 58.24854327 12 62.765625 12 62.765625 C5.33543097 81.67448477 -2.88671875 88.33203125 -2.88671875 88.33203125 C-27.0548355 95.93239973 -40 94.765625 -40 94.765625 C-60.47152954 84.97571657 -67 75.765625 -67 75.765625 C-77.29644659 42.37873237 -73.0390625 25.05078125 -73.0390625 25.05078125 C-62.35093608 3.0577456 -50.8671875 -3.7578125 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,126.234375)"/>
      </svg>
      <span className="nav-brand-text">Sales <em>Companion</em></span>
    </a>

    {/*  Desktop nav  */}
    <div className="nav-desktop" id="nav-desktop">
      <ul className="nav-links" role="list">
        <li><a href="#features">{t('landing.features')}</a></li>
        <li><a href="#roles">{t('landing.roles')}</a></li>
        <li><a href="#plans">{t('landing.pricing')}</a></li>
        <li><a href="#testimonials">{t('landing.testimonials')}</a></li>
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

  <div className="hero-badge" role="status" aria-label="Intelligence B2B Cameroun">
    <span className="hero-badge-dot" aria-hidden="true"></span>
    {t('landing.heroBadge')}&nbsp;
    <span className="footer-flag" aria-label="Drapeau Cameroun">🇨🇲</span>
  </div>

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
          <span className="mockup-header-text" style={{"color":"var(--gm)"}}>Sales Companion</span>
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
            <span style={{"color":"var(--tx3)"}}>Assistant IA</span>
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
            <span className="plan-feature-check" aria-hidden="true">✓</span>
            <strong>500</strong> {t("landing.plansSection.pPro1")}
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
          <svg
            className="sc-icon"
            width="22" height="22"
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M0 0 C57 0 199 0 199 57 C199 199 142 199 0 199 C-57 199 -57 142 -57 0 Z" fill="#1B7A3E" transform="translate(57,0.5)"/>
            <path d="M0 0 C12 11 12 24 -9 25 C-11 18 -16 13 -41 15 C-43 23 -43 23 -19 33 C10 39 10 49 14 74 C8 93 0 93 -25 97 C-48 95 -66 63 -66 63 C-47 61 -47 61 -36 78 C-14 78 -7 62 -7 62 C-24 55 -60 35 -62 15 C-56 2 -49 -2 -49 -2 C-35 -8 -13 -9 0 0 Z" fill="#FBFCFB" transform="translate(105,124)"/>
            <path d="M0 0 C12 18 12 21 -8 26 C-21 11 -41 12 -53 33 C-47 69 -33 77 -14 71 C-7 57 12 63 12 63 C6 88 -40 95 -67 76 C-77 25 -62 3 -51 -4 C-35 -12 -14 -10 0 0 Z" fill="#FBFCFC" transform="translate(203,126)"/>
          </svg>
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
      <span>© 2025 Sales Companion. {t("landing.footer.rights")}</span>
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
