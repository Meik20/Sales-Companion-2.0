const fs = require('fs');
let content = fs.readFileSync('src/features/landing/components/LandingPage.tsx', 'utf8');

content = content.replace(/<div className="stat-label">entreprises indexées<\/div>/g, '<div className="stat-label">{t("landing.stats.indexed")}</div>');
content = content.replace(/<div className="stat-label">régions du Cameroun<\/div>/g, '<div className="stat-label">{t("landing.stats.regions")}</div>');
content = content.replace(/<div className="stat-label">secteurs couverts<\/div>/g, '<div className="stat-label">{t("landing.stats.sectors")}</div>');
content = content.replace(/<div className="stat-label">mode hors-ligne PWA<\/div>/g, '<div className="stat-label">{t("landing.stats.offline")}</div>');

content = content.replace(/<span className="section-label">Fonctionnalités<\/span>/g, '<span className="section-label">{t("landing.features")}</span>');
content = content.replace(/Tout ce qu'il faut<br \/>pour <em>prospecter efficacement<\/em>/g, '{t("landing.featuresSection.title1")}<br />{t("landing.featuresSection.title2")} <em>{t("landing.featuresSection.title3")}</em>');
content = content.replace(/Un outil pensé pour le terrain camerounais — base de données officielle,[\s\S]*?CRM léger, IA et gestion d'équipe réunis./g, '{t("landing.featuresSection.sub")}');

content = content.replace(/<h3 className="feature-title">Recherche d'entreprises<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f1Title")}</h3>');
content = content.replace(/Interrogez une base officielle de plus de 500K \+ entreprises camerounaises.[\s\S]*?Filtrez par secteur, région, ville ou recherche libre. Résultats instantanés./g, '{t("landing.featuresSection.f1Desc")}');
content = content.replace(/→ Base RCCM & NIU officiels/g, '{t("landing.featuresSection.f1Tag")}');

content = content.replace(/<h3 className="feature-title">Pipeline CRM<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f2Title")}</h3>');
content = content.replace(/Suivez vos prospects de la prospection à la conclusion.[\s\S]*?Statuts personnalisables, notes, actions planifiées et historique complet./g, '{t("landing.featuresSection.f2Desc")}');
content = content.replace(/→ Prospection → Négociation → Conclue/g, '{t("landing.featuresSection.f2Tag")}');

content = content.replace(/<h3 className="feature-title">Gestion d'équipe<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f3Title")}</h3>');
content = content.replace(/Les managers créent leur équipe, assignent des prospects et suivent[\s\S]*?les performances en temps réel sur un tableau de bord consolidé./g, '{t("landing.featuresSection.f3Desc")}');
content = content.replace(/→ Assignations & tableau de bord équipe/g, '{t("landing.featuresSection.f3Tag")}');

content = content.replace(/<h3 className="feature-title">Assistant IA<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f4Title")}</h3>');
content = content.replace(/Obtenez des conseils de stratégie commerciale, analyses de secteurs[\s\S]*?et suggestions d'approches grâce à un assistant IA intégré./g, '{t("landing.featuresSection.f4Desc")}');
content = content.replace(/→ Propulsé par Groq/g, '{t("landing.featuresSection.f4Tag")}');

content = content.replace(/<h3 className="feature-title">Recherches sauvegardées<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f5Title")}</h3>');
content = content.replace(/Sauvegardez vos critères de recherche fréquents pour les relancer en[\s\S]*?un clic. Accès rapide à vos segments cibles préférés./g, '{t("landing.featuresSection.f5Desc")}');
content = content.replace(/→ Accès instantané à vos segments/g, '{t("landing.featuresSection.f5Tag")}');

content = content.replace(/<h3 className="feature-title">Progressive Web App<\/h3>/g, '<h3 className="feature-title">{t("landing.featuresSection.f6Title")}</h3>');
content = content.replace(/Installez Sales Companion sur votre téléphone comme une app native.[\s\S]*?Mode hors ligne, synchronisation automatique dès le retour de connexion./g, '{t("landing.featuresSection.f6Desc")}');
content = content.replace(/→ Android & iOS, sans App Store/g, '{t("landing.featuresSection.f6Tag")}');

content = content.replace(/<span className="section-label">Profils<\/span>/g, '<span className="section-label">{t("landing.roles")}</span>');
content = content.replace(/Conçu pour <em>chaque profil<\/em><br \/>commercial/g, '{t("landing.rolesSection.title1")} <em>{t("landing.rolesSection.title2")}</em><br />{t("landing.rolesSection.title3")}');
content = content.replace(/Que vous soyez commercial indépendant ou manager d'une équipe,[\s\S]*?Sales Companion s'adapte à votre rôle./g, '{t("landing.rolesSection.sub")}');

content = content.replace(/<h3 className="role-title">Commercial indépendant<\/h3>/g, '<h3 className="role-title">{t("landing.rolesSection.indepTitle")}</h3>');
content = content.replace(/Gérez votre propre portefeuille de prospects en autonomie complète.[\s\S]*?Votre pipeline, vos recherches, votre rythme./g, '{t("landing.rolesSection.indepDesc")}');
content = content.replace(/Recherche entreprises illimitée \(selon plan\)/g, '{t("landing.rolesSection.indepPerk1")}');
content = content.replace(/Pipeline personnel avec statuts/g, '{t("landing.rolesSection.indepPerk2")}');
content = content.replace(/Recherches sauvegardées/g, '{t("landing.rolesSection.indepPerk3")}');
content = content.replace(/Assistant IA commercial/g, '{t("landing.rolesSection.indepPerk4")}');

content = content.replace(/<h3 className="role-title">Manager commercial<\/h3>/g, '<h3 className="role-title">{t("landing.rolesSection.mgrTitle")}</h3>');
content = content.replace(/Créez et pilotez votre équipe de commerciaux. Assignez des prospects,[\s\S]*?suivez les performances et consolidez le pipeline./g, '{t("landing.rolesSection.mgrDesc")}');
content = content.replace(/Vue pipeline consolidée équipe/g, '{t("landing.rolesSection.mgrPerk1")}');
content = content.replace(/Assignation de prospects aux membres/g, '{t("landing.rolesSection.mgrPerk2")}');
content = content.replace(/Tableau de bord manager temps réel/g, '{t("landing.rolesSection.mgrPerk3")}');
content = content.replace(/Gestion des accès équipe/g, '{t("landing.rolesSection.mgrPerk4")}');

content = content.replace(/<span className="section-label">Tarifs<\/span>/g, '<span className="section-label">{t("landing.pricing")}</span>');
content = content.replace(/Un plan pour <em>chaque étape<\/em><br \/>de votre croissance/g, '{t("landing.plansSection.title1")} <em>{t("landing.plansSection.title2")}</em><br />{t("landing.plansSection.title3")}');
content = content.replace(/Démarrez gratuitement et évoluez selon vos besoins.[\s\S]*?Tous les plans incluent la base officielle camerounaise./g, '{t("landing.plansSection.sub")}');

content = content.replace(/<div className="plan-name">Gratuit<\/div>/g, '<div className="plan-name">{t("landing.plansSection.free")}</div>');
content = content.replace(/<span className="badge badge-default">Toujours disponible<\/span>/g, '<span className="badge badge-default">{t("landing.plansSection.freeBadge")}</span>');
content = content.replace(/Pour toujours/g, '{t("landing.plansSection.freePeriod")}');
content = content.replace(/10 recherches par jour/g, '{t("landing.plansSection.pFree1")}');
content = content.replace(/Accès base entreprises/g, '{t("landing.plansSection.pFree2")}');
content = content.replace(/Pipeline personnel/g, '{t("landing.plansSection.pFree3")}');
content = content.replace(/Application PWA installable/g, '{t("landing.plansSection.pFree4")}');
content = content.replace(/Commencer gratuitement/g, '{t("landing.plansSection.startFreeBtn")}');

content = content.replace(/<div className="plan-name">Pro<\/div>/g, '<div className="plan-name">{t("landing.plansSection.pro")}</div>');
content = content.replace(/<span className="badge badge-success">Le plus populaire<\/span>/g, '<span className="badge badge-success">{t("landing.plansSection.proBadge")}</span>');
content = content.replace(/>15 000 </g, '>{t("landing.plansSection.proPrice")} <');
content = content.replace(/par mois/g, '{t("landing.plansSection.proPeriod")}');
content = content.replace(/<strong>500<\/strong> recherches par jour/g, '<strong>500</strong> {t("landing.plansSection.pPro1")}');
content = content.replace(/Base complète \+ filtres avancés/g, '{t("landing.plansSection.pPro2")}');
content = content.replace(/Pipeline illimité \+ notes/g, '{t("landing.plansSection.pPro3")}');
content = content.replace(/Export Excel/g, '{t("landing.plansSection.pPro6")}');
content = content.replace(/Choisir Pro/g, '{t("landing.plansSection.chooseProBtn")}');
content = content.replace(/<div className="plan-featured-label" aria-label="Plan recommandé">Recommandé<\/div>/g, '<div className="plan-featured-label" aria-label="Plan recommandé">{t("landing.plansSection.recommended")}</div>');

content = content.replace(/<div className="plan-name">Team<\/div>/g, '<div className="plan-name">{t("landing.plansSection.team")}</div>');
content = content.replace(/<span className="badge badge-gold">Pour les équipes<\/span>/g, '<span className="badge badge-gold">{t("landing.plansSection.teamBadge")}</span>');
content = content.replace(/>50 000 </g, '>{t("landing.plansSection.teamPrice")} <');
content = content.replace(/Recherches <strong>illimitées<\/strong>/g, '{t("landing.plansSection.pTeam1")} <strong>{t("landing.plansSection.pTeam1b")}</strong>');
content = content.replace(/Tout le plan Pro inclus/g, '{t("landing.plansSection.pTeam2")}');
content = content.replace(/Gestion équipe & rôles/g, '{t("landing.plansSection.pTeam3")}');
content = content.replace(/Assignation de prospects/g, '{t("landing.plansSection.pTeam4")}');
content = content.replace(/Dashboard manager temps réel/g, '{t("landing.plansSection.pTeam5")}');
content = content.replace(/Support prioritaire/g, '{t("landing.plansSection.pTeam6")}');
content = content.replace(/Contacter pour Team/g, '{t("landing.plansSection.contactTeamBtn")}');

content = content.replace(/<span className="section-label">Témoignages<\/span>/g, '<span className="section-label">{t("landing.testimonials")}</span>');
content = content.replace(/Ce que disent<br \/>nos <em>utilisateurs<\/em>/g, '{t("landing.testiSection.title1")}<br />{t("landing.testiSection.title2")} <em>{t("landing.testiSection.title3")}</em>');

content = content.replace(/"En quelques minutes, j'ai trouvé 30 entreprises BTP à Douala avec numéros et dirigeants.[\s\S]*?Avant, je passais des heures à compiler ces infos manuellement."/g, '{t("landing.testiSection.t1Text")}');
content = content.replace(/<div className="testimonial-role">Commercial BTP — Douala<\/div>/g, '<div className="testimonial-role">{t("landing.testiSection.t1Role")}</div>');

content = content.replace(/"Le mode manager change tout. Je vois le pipeline de toute mon équipe en temps réel[\s\S]*?et j'assigne les prospects directement depuis mon téléphone."/g, '{t("landing.testiSection.t2Text")}');
content = content.replace(/<div className="testimonial-role">Directrice commerciale — Yaoundé<\/div>/g, '<div className="testimonial-role">{t("landing.testiSection.t2Role")}</div>');

content = content.replace(/"L'app fonctionne même en zone avec signal faible. Pour les tournées terrain[\s\S]*?dans les régions, c'est indispensable. La PWA s'installe comme une vraie app."/g, '{t("landing.testiSection.t3Text")}');
content = content.replace(/<div className="testimonial-role">Commercial terrain — Bafoussam<\/div>/g, '<div className="testimonial-role">{t("landing.testiSection.t3Role")}</div>');

content = content.replace(/Prêt à prospecter<br \/>plus <em>intelligemment<\/em> \?/g, '{t("landing.ctaSection.title1")}<br />{t("landing.ctaSection.title2")} <em>{t("landing.ctaSection.title3")}</em> {t("landing.ctaSection.title4")}');
content = content.replace(/Rejoignez les commerciaux camerounais qui utilisent Sales Companion[\s\S]*?pour trouver, suivre et conclure plus vite./g, '{t("landing.ctaSection.sub")}');
content = content.replace(/Créer un compte gratuit/g, '{t("landing.ctaSection.createAccount")}');
content = content.replace(/Se connecter/g, '{t("landing.ctaSection.login")}');
content = content.replace(/Aucune carte bancaire requise · Gratuit au démarrage/g, '{t("landing.ctaSection.note")}');

content = content.replace(/La plateforme B2B dédiée aux commerciaux et managers camerounais.[\s\S]*?Intelligence terrain, PWA hors-ligne, base de données officielle./g, '{t("landing.footer.desc")}');
content = content.replace(/Made in Cameroun 🇨🇲/g, '{t("landing.footer.madeIn")}');
content = content.replace(/<h4>Produit<\/h4>/g, '<h4>{t("landing.footer.product")}</h4>');
content = content.replace(/<h4>Application<\/h4>/g, '<h4>{t("landing.footer.app")}</h4>');
content = content.replace(/<h4>Support<\/h4>/g, '<h4>{t("landing.footer.support")}</h4>');
content = content.replace(/>Recherche<\/a><\/li>/g, '>{t("landing.footer.search")}</a></li>');
content = content.replace(/>Pipeline<\/a><\/li>/g, '>{t("landing.footer.pipeline")}</a></li>');
content = content.replace(/>Assistance<\/a><\/li>/g, '>{t("landing.footer.assistance")}</a></li>');
content = content.replace(/>Mon compte<\/a><\/li>/g, '>{t("landing.footer.account")}</a></li>');
content = content.replace(/Tous droits réservés./g, '{t("landing.footer.rights")}');

fs.writeFileSync('src/features/landing/components/LandingPage.tsx', content);
console.log('Translations injected successfully.');
