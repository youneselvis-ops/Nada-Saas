# Journal de bord — NADA

## 2026-09-05 — Composant manquant : le ticket en Martian Mono (section 10)
En continuant la revue, j'ai vérifié si la charte typographique de la section 10 était vraiment respectée : « Martian Mono exclusivement à l'intérieur du composant qui affiche le ticket extrait ». La police était bien chargée (`layout.tsx`, variable `--font-martian-mono`) et déclarée comme token Tailwind (`font-receipt`), mais **jamais utilisée nulle part** — aucun composant n'affichait le ticket extrait dans son vernaculaire propre. Un vrai manque, pas une simple finition.

**Corrigé :** nouveau composant `src/components/receipt-ticket.tsx` — rendu du ticket extrait (nom du magasin, date, chaque `receipt_item` avec son prix, total) en `font-receipt` (Martian Mono), bordure pointillée façon reçu thermique, astérisque + légende traduite pour les articles non alimentaires. Intégré sur l'écran de revue (`/receipts/[id]/review`), au-dessus de la liste éditable des articles d'inventaire (qui reste en Instrument Sans, comme le reste de l'app). L'écran de revue récupère maintenant aussi le `receipt` et ses `receipt_items` bruts, pas seulement les `inventory_items`.

**Porte qualité :** lint ✅ types ✅ tests ✅ (98/98) build ✅

**Deuxième écart trouvé en poussant la vérification plus loin :** la section 10 exige un « contraste AA vérifié, sans l'annoncer ». Je ne l'avais affirmé que par lecture, jamais calculé. Calcul réel des ratios WCAG (formule de luminance relative officielle) sur les paires de couleurs effectivement utilisées dans l'app : `--fade` (#8C8B84) sur `--paper` — la combinaison utilisée pour tout le texte secondaire de l'application (libellés, descriptions, dates) — ne donne que **3.27:1**, en dessous du seuil AA de 4.5:1 pour du texte de taille normale. Toutes les autres combinaisons (`--ink`/`--paper` : 15.85, `--paper`/`--nopal` : 6.03, `--jamaica`/`--paper` : 7.43) passent largement.

**Corrigé :** `--fade` assombri de `#8C8B84` à `#706F69` (même teinte grise chaude, luminance réduite), ce qui porte le contraste à 4.83:1 — au-dessus du seuil avec une marge raisonnable. `CLAUDE.md` (le cahier des charges lui-même) n'a pas été modifié — ce n'est pas ma place de réécrire la spec, l'écart est documenté ici comme pour les autres déviations. Ajout de `src/lib/contrast.ts` (calcul de ratio WCAG à partir de deux couleurs hexadécimales) et d'un test de non-régression (`tests/unit/contrast.test.ts`) qui vérifie explicitement que chaque paire couleur/fond réellement utilisée dans l'app respecte AA — pour que ce genre d'écart soit détecté automatiquement si quelqu'un retouche la palette plus tard, plutôt que de dépendre d'une relecture manuelle.

**Porte qualité :** lint ✅ types ✅ tests ✅ (104/104) build ✅

**Suivant :** continuer à surveiller la PR ; chercher d'autres écarts entre la charte de la section 10 et l'implémentation réelle si le temps le permet.

## 2026-09-05 — Le déploiement Vercel fonctionnait en réalité (et un vrai déploiement cassé, corrigé)
Coup de théâtre en lisant les notifications GitHub en attente sur la PR : l'intégration Vercel↔GitHub **fonctionnait depuis le début**. Chaque push sur la branche a bien déclenché un déploiement pour les projets `nada` et `nada-app` (créés lors du diagnostic précédent), avec des statuts « Ready » visibles dans les commentaires automatiques de `vercel[bot]` sur la PR — `https://nada-sigma-two.vercel.app` et `https://nada-app.vercel.app` sont de vraies URL de prévisualisation actives. Le blocage précédemment diagnostiqué (connecteur MCP Vercel en écriture seule, sans lecture) était réel mais concernait uniquement les outils `get_project`/`get_deployment`/etc. utilisés *depuis cette session* — pas l'intégration GitHub elle-même, qui est un mécanisme entièrement séparé côté Vercel et n'a jamais été affectée.

**Mais un vrai problème est apparu :** les deux derniers commentaires de `vercel[bot]` avant cette découverte annoncent un **échec de déploiement** sur les deux projets : « Hobby accounts are limited to daily cron jobs. This cron expression (0 * * * *) would run more than once per day. » — le cron horaire des alertes d'expiration (migration/commit de la phase 4) dépasse la limite du palier gratuit Vercel, et fait donc échouer **tout le déploiement**, pas seulement la fonctionnalité cron.

**Corrigé immédiatement (c'est un CI rouge sur une PR que j'ai ouverte, donc à traiter tout de suite, pas à contourner) :**
- `vercel.json` : le cron `/api/cron/expiry-alerts` passe de `0 * * * *` (toutes les heures) à `0 23 * * *` (une fois par jour, à 23h UTC = 17h heure de Mexico, le marché prioritaire selon la section 1 du cahier des charges).
- `src/app/api/cron/expiry-alerts/route.ts` : suppression du filtre `isAlertHour` par profil. Sur un cron unique quotidien à heure UTC fixe, ce filtre aurait silencieusement exclu **tous** les utilisateurs dont le fuseau horaire ne correspond pas exactement à cet instant — c'est-à-dire tous les utilisateurs fr-FR, qui n'auraient alors **jamais** reçu d'alerte. Tous les profils sont maintenant traités à chaque exécution ; l'anti-doublon (`notifications_log`, clé unique par jour local) continue de garantir un seul envoi par jour et par utilisateur.
- La fonction `isAlertHour` reste dans `src/lib/notifications.ts`, toujours testée unitairement, documentée comme prête à être réactivée si le projet passe un jour sur un palier Vercel autorisant un cron horaire (Pro).

**Compromis produit assumé, pas caché :** avec un cron gratuit unique par jour, il est mathématiquement impossible de notifier deux fuseaux horaires différents à 17h locale pile pour chacun. Les utilisateurs mexicains sont notifiés exactement à 17h ; les utilisateurs français reçoivent leur alerte une fois par jour aussi, mais à une heure locale décalée (autour de minuit/1h du matin en hiver/été). C'est un vrai écart avec la lettre du cahier des charges (section 9, phase 4 : « 17h heure locale de l'utilisateur »), imposé par une contrainte d'infrastructure gratuite, pas par choix. Revenir à une précision parfaite pour les deux marchés nécessiterait soit un palier Vercel payant (décision qui coûte de l'argent — à l'humain de trancher), soit un mécanisme de cron externe déclenchant l'API via un service tiers gratuit à fréquence plus fine.

**Porte qualité :** lint ✅ types ✅ tests ✅ (98/98, inchangés) build ✅ — poussé immédiatement pour rétablir un déploiement fonctionnel.

**Confirmé :** dans les 2 minutes suivant le push du correctif, `vercel[bot]` a republié son commentaire de statut avec **« Ready »** pour les deux projets (`nada` → `nada-sigma-two.vercel.app`, `nada-app` → `nada-app.vercel.app`) sur le commit du correctif. Le déploiement fonctionne réellement. `web_fetch_vercel_url` a été retenté sur cette URL fraîchement confirmée « Ready » et échoue encore de la même façon qu'avant (« Unable to create shareable URL ») — cela confirme définitivement que le problème de lecture est bien propre aux outils MCP Vercel de cette session, pas un problème de déploiement. Le bot GitHub de Vercel constitue une preuve de premier niveau, indépendante de ces outils, et suffisante pour considérer l'étape « déploiement vérifié » de la porte qualité (section 12) comme franchie pour les six phases.

**Reste non vérifiable depuis ce sandbox :** navigation interactive réelle sur l'URL déployée (le réseau du sandbox bloque `*.vercel.app` en sortie directe, comme documenté depuis la phase 1) et `get_runtime_errors`/`get_runtime_logs` (même connecteur en lecture bloqué). L'humain peut visiter `https://nada-sigma-two.vercel.app` ou `https://nada-app.vercel.app` directement pour la vérification interactive finale.

## 2026-09-05 — Test d'intégration RLS (obligatoire, section 11) + bug réel trouvé et corrigé
En attendant que le connecteur Vercel soit réparé côté compte, j'ai fait le travail de vérification que je pouvais réellement faire : le test d'intégration RLS inter-utilisateurs explicitement marqué « obligatoire et non négociable » en section 11, que j'avais seulement justifié par lecture du code jusqu'ici, jamais exécuté pour de vrai.

**Méthode :** deux utilisateurs jetables créés directement dans `auth.users` via `execute_sql`, un `inventory_items` et un `receipts` appartenant à l'utilisateur A, puis bascule de session (`set local role authenticated` + `set_config('request.jwt.claims', ...)`) pour simuler tour à tour le JWT de l'utilisateur B et de l'utilisateur A — la méthode officiellement documentée par Supabase pour tester des policies RLS en SQL direct. Script committé dans `tests/integration/rls-isolation.sql`, rejouable tel quel (auto-nettoyant).

**Bug réel trouvé :** la première tentative sur `receipts` a levé `ERROR: 42P17: infinite recursion detected in policy for relation "receipts"`. Cause racine : la policy restrictive de limitation à 20 tickets/jour (migration 007) faisait un `select count(*) from receipts ...` directement dans son `with check`, et ce sous-`select` sur la table cible elle-même déclenche une récursion de l'évaluation RLS — un piège Postgres/Supabase documenté (confirmé via `search_docs`).

**Correction (migrations 011-013) :** le comptage a été déplacé dans une fonction `SECURITY DEFINER`. Premier essai encore imparfait : la fonction acceptait un `p_user_id` en paramètre sans vérifier qu'il correspondait à l'appelant, ce qui aurait permis à n'importe quel utilisateur authentifié d'apprendre le nombre de tickets récents d'un autre utilisateur via `/rest/v1/rpc/count_recent_receipts` (remonté par `get_advisors`, pas juste théorique). Corrigé en supprimant complètement le paramètre — la fonction utilise uniquement `auth.uid()` en interne — **et** en la déplaçant dans un schéma `private` non exposé par l'API, suivant la recommandation explicite de la documentation Supabase pour ce type de fonction.

**Vérifié après correction :** le script complet repasse sans erreur (isolation croisée sur `inventory_items` et `receipts`, plus un test de la limite de 20/jour qui bloque bien un 21e ticket). `get_advisors` sécurité repasse à zéro avis à part `auth_leaked_password_protection`, qui ne s'applique pas à NADA (authentification OTP uniquement, aucun mot de passe n'existe jamais dans le système — vérifié et écarté en connaissance de cause, pas ignoré).

**Bloqué sur :** rien. Base de données remise dans un état propre (utilisateurs de test et données associées supprimés par cascade, vérifié par requête).

**Extension à la couverture complète :** le script initial ne testait que 2 des 9 tables protégées par RLS. Étendu pour couvrir les 9 : `profiles`, `receipts` (+ limite de débit), `receipt_items` (policy par jointure, pas de colonne `user_id` directe), `inventory_items`, `price_observations`, `push_subscriptions`, `notifications_log` (isolation par utilisateur), plus `shelf_life_catalog` et `recipe_cache` (données partagées : lecture/écriture pour tout utilisateur authentifié, mais refusée à `anon`). Le script complet et final (`tests/integration/rls-isolation.sql`) a été rejoué une dernière fois en un seul bloc pour confirmer qu'il fonctionne de bout en bout tel que committé, avec nettoyage vérifié après coup (plus aucune ligne de test dans `auth.users`, `receipts`, `recipe_cache`, etc.).

**Suivant :** continuer à guetter une occasion de vérifier le déploiement Vercel.

## 2026-09-05 — Phase 6 : Le bilan mensuel
**Fait :**
- `src/lib/monthly-summary.ts` : agrégats purs et testés unitairement — `computeMonthlyTotals` (valeur sauvée = articles `consumed`, valeur jetée = `wasted`, sur le mois en cours), `topWastedProducts` (top 3 par valeur), `computePriceVariations` (variation première/dernière observation, seuil de 3 observations minimum de la section 7, triée par popularité d'achat, top 5), `monthBounds`/`previousMonthBounds` (bornes UTC du mois, avec gestion correcte des changements d'année).
- Écran `/dashboard` (« Ce mois-ci ») réécrit en Server Component avec données réelles : montant sauvé en très grand (le geste fort de la section 10, jusque-là un `$0` statique), valeur jetée, top 3 des produits gaspillés, variations de prix — plus l'état vide d'origine si aucun ticket n'existe encore.
- Export image partageable : route `GET /api/summary/image` générant un PNG **1080×1920** côté serveur avec `next/og` (`ImageResponse`), polices Instrument Sans (regular + bold) embarquées dans le dépôt (`src/lib/fonts/`, téléchargées une fois depuis Google Fonts — le sandbox bloque `*.vercel.app` et `*.supabase.co` mais pas `fonts.gstatic.com`) et chargées via `fetch(new URL(...))` pour un bundling fiable en production. **Vérifié visuellement** par un rendu de test isolé (contournant Supabase, injoignable depuis ce sandbox) : le montant principal est lisible sans zoom, satisfaisant le critère d'acceptation.
- Email récapitulatif du 1er du mois : `GET /api/cron/monthly-summary` (nouveau cron `0 9 1 * *` dans `vercel.json`), même mécanisme anti-doublon que les alertes d'expiration (écriture dans `notifications_log` avant l'envoi, clé de dédoublonnage = mois `YYYY-MM` résumé), calcule le mois précédent pour chaque profil et envoie via Resend (no-op journalisé sans clé, comme les autres emails).

**Décisions techniques :**
- Les polices sont vendues dans le dépôt plutôt que chargées à la volée à chaque requête : plus rapide, plus fiable en production, et évite une dépendance réseau supplémentaire au moment de générer l'image.
- Le test du critère « lisible sans zoom » a été fait par un rendu direct de `ImageResponse` avec des données factices (script isolé, supprimé après vérification), car le flux complet (authentification → Supabase → route) n'est pas exécutable dans ce sandbox — même limitation réseau que documentée aux phases précédentes.

**Porte qualité :** lint ✅ types ✅ tests ✅ (98/98) e2e ⚠️ (même blocage réseau que phases 2-5) build ✅ (route image compilée et testée manuellement) deploy ⏳ advisors ✅ (aucun changement de schéma) runtime ⏳

**Bloqué sur :** rien de nouveau — toutes les phases du cahier des charges (1 à 6) sont maintenant implémentées. Il reste à débloquer le déploiement Vercel (voir phase 1) pour la vérification finale en ligne, et à fournir `ANTHROPIC_API_KEY`/`RESEND_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` pour sortir du mode mock.

**Suivant :** une fois le déploiement vérifiable, exécuter la porte qualité complète en ligne (section 12) pour chaque phase, mesurer l'exactitude d'extraction réelle sur les fixtures avec une vraie clé Anthropic, et valider sur de vrais tickets photographiés.

## 2026-09-05 — Phase 5 : La recette anti-gaspi
**Fait :**
- Bouton « ¿Qué hacer con esto? »/« Que faire avec ça ? » affiché sur `/inventory` dès qu'il y a des articles dans la zone « périme sous 48h », menant vers `/recipe?items=id1,id2,...`.
- Route `POST /api/recipes/generate` : résout les `inventory_items` demandés (vérifie l'appartenance à l'utilisateur), construit la liste d'ingrédients disponibles, calcule une clé de cache déterministe (`buildRecipeCacheKey`, insensible à l'ordre et aux doublons, incluant la locale), regarde d'abord dans `recipe_cache` avant d'appeler le modèle.
- Génération de recette (réelle via Claude texte, mock déterministe sinon) contrainte au prompt système à n'utiliser que les ingrédients fournis + une liste courte de basiques (huile/sel/poivre/ail/oignon/riz/œuf, en es-MX et fr-FR), avec un seul rejeu si la validation échoue — même schéma de robustesse que l'extraction de tickets.
- **Contrôle automatisé de la règle centrale** (`recipeUsesOnlyAllowedIngredients`) : vérifie qu'aucun ingrédient de la recette n'est absent de l'inventaire fourni ni de la liste de basiques — appliqué à la fois côté génération réelle (rejeu puis échec propre) et testé unitairement avec des cas positifs et négatifs. C'est un test automatisé, pas une vérification visuelle, conformément au critère d'acceptation.
- Temps de préparation contraint à 30 minutes maximum par le schéma Zod (`prep_minutes` entier, `max(30)`).
- Migration `010_recipe_cache` : table `recipe_cache` (clé unique sur `cache_key`), lecture/écriture ouvertes aux utilisateurs authentifiés (cache partagé, données non sensibles).
- Écran `/recipe` : titre, temps de préparation, liste d'ingrédients, étapes numérotées, retour vers l'inventaire.

**Décisions techniques :**
- Le cache est partagé entre utilisateurs (clé = ingrédients + locale, pas d'user_id) plutôt que par utilisateur : deux personnes avec les mêmes produits en fin de vie reçoivent la même recette, ce qui maximise l'effet du cache et correspond à l'objectif de maîtrise des coûts de la section 9.
- La contrainte d'ingrédients est vérifiée deux fois : une fois dans le module de génération (rejeu puis échec propre si toujours invalide après une deuxième tentative), et une fois de plus comme fonction pure testée unitairement — c'est cette dernière qui constitue le test automatisé exigé par le critère d'acceptation, indépendamment de l'implémentation de l'appel au modèle.

**Porte qualité :** lint ✅ types ✅ tests ✅ (85/85) e2e ⚠️ (même blocage réseau que phases 2-4) build ✅ deploy ⏳ advisors ✅ runtime ⏳

**Bloqué sur :** rien de nouveau.

**Suivant :** phase 6 — le bilan mensuel.

## 2026-09-05 — Phase 4 : Les alertes
**Fait :**
- Migration `009_profile_timezone_and_push_subscriptions` : colonne `profiles.timezone` (défaut `America/Mexico_City`) et table `push_subscriptions` (RLS par propriétaire) — absentes du schéma initial de la section 6 mais nécessaires pour « 17h heure locale » et le push web.
- Route cron `GET /api/cron/expiry-alerts`, protégée par `Authorization: Bearer $CRON_SECRET` (motif standard Vercel). Tourne toutes les heures (`vercel.json`, `0 * * * *`) ; pour chaque profil dont l'heure locale (`Intl.DateTimeFormat` avec `hourCycle: "h23"`, testé unitairement) est 17h, sélectionne les `inventory_items` actifs expirant sous 48h, écrit d'abord dans `notifications_log` (la contrainte unique `(user_id, kind, dedupe_key)` fait le vrai travail anti-doublon, pas la logique applicative), puis envoie l'email et le push seulement si l'écriture du journal a réussi.
- Email Resend (`src/lib/email.ts`) : sujet et liste d'articles en es-MX/fr-FR selon la locale du profil ; no-op journalisé (sans contenu de ticket) si `RESEND_API_KEY` absent.
- Notification web push : clés VAPID générées moi-même avec `web-push` (aucun compte tiers requis, donc pas de secret à demander), service worker (`public/sw.js`), bouton « Activer les notifications » dans `/settings`, route `POST /api/push/subscribe` pour enregistrer l'abonnement, nettoyage automatique des abonnements expirés (404/410) lors de l'envoi.
- Tests unitaires : `localHour`/`localDateKey`/`isAlertHour` sur plusieurs fuseaux (Mexico vs Paris, y compris le passage de minuit).

**Décisions techniques :**
- Cron horaire plutôt qu'un cron par fuseau : Vercel Cron n'exécute qu'en UTC, donc c'est la fonction elle-même qui détermine quels utilisateurs sont à 17h locale à chaque passage. **Point de vigilance :** certains paliers Vercel (notamment Hobby, historiquement) restreignent la fréquence des cron jobs — à vérifier une fois le déploiement débloqué ; si le palier actuel ne permet pas une fréquence horaire, il faudra soit passer sur un palier supérieur (décision produit/coût, donc à valider avec l'humain), soit accepter une granularité plus grossière (ex. toutes les 3h, avec une fenêtre de tolérance sur l'heure cible).
- `profiles.timezone` a un défaut fixe plutôt qu'une détection automatique : il n'y a pas encore d'écran d'onboarding pour le demander. À revisiter si un écran d'accueil est ajouté.

**Porte qualité :** lint ✅ types ✅ tests ✅ (73/73) e2e ⚠️ (même blocage réseau que phases 2-3) build ✅ deploy ⏳ advisors ✅ runtime ⏳

**Bloqué sur :** `RESEND_API_KEY` toujours absente (email no-op journalisé en attendant) ; mêmes blocages Vercel/secrets que les phases précédentes. Impossible de tester le cron de bout en bout dans ce sandbox — `*.supabase.co` y est bloqué par la policy réseau (voir phases 1-2), donc même un script Node local ne peut pas frapper le vrai projet Supabase depuis ici. La logique pure (calcul d'heure locale, anti-doublon) est testée unitairement ; le test d'intégration réel attendra un déploiement vérifiable.

**Suivant :** phase 5 — la recette anti-gaspi.

## 2026-09-05 — Phase 3 : L'inventaire vivant
**Fait :**
- Écran `/inventory` : liste dense triée par `expires_at` croissant, une règle horizontale fine entre les articles, date alignée à droite — pas de grille de cartes.
- Trois zones calculées côté client (`expiryZone` dans `src/lib/inventory.ts`, testée unitairement) : périme sous 48h (≤2 jours, y compris déjà périmé), sous 5 jours, plus tard. Aucune couleur décorative — le rouge (`--jamaica`) n'apparaît que sur le compteur de valeur en péremption et le bouton « jeté », conformément à la charte.
- Compteur permanent en très grand de la valeur totale des articles qui périment sous 48h, affiché seulement s'il y a quelque chose d'urgent.
- Actions à un geste : « Comí »/« Mangé » et « Tiré »/« Jeté » sur chaque ligne, sans confirmation — mise à jour immédiate de `inventory_items.status` (`consumed`/`wasted`) + `resolved_at`, avec une transition d'opacité courte (200ms, désactivée par `prefers-reduced-motion` via la règle globale déjà en place) avant que la ligne ne quitte la liste.
- Lien « Inventario »/« Inventaire » ajouté à la navigation du layout `(app)`.
- Tests unitaires pour `daysUntil`/`expiryZone` (limites 48h/5 jours, articles déjà expirés). Test e2e structuré (`tests/e2e/inventory.spec.ts`) pour le geste unique « mangé » — même limitation réseau que les autres e2e (voir phase 2).

**Décisions techniques :**
- Aucune nouvelle migration nécessaire : les policies RLS et la table `inventory_items` de la phase 1 couvrent déjà `update`/lecture par propriétaire.
- Zones calculées en JavaScript à la lecture plutôt qu'en SQL — plus simple à tester unitairement et suffisant vu le volume d'articles par utilisateur.

**Porte qualité :** lint ✅ types ✅ tests ✅ (66/66) e2e ⚠️ (même blocage réseau que phase 2) build ✅ deploy ⏳ advisors ✅ (aucun changement de schéma) runtime ⏳

**Bloqué sur :** rien de nouveau — mêmes blocages qu'aux phases 1-2 (secrets tiers, déploiement Vercel à vérifier).

**Suivant :** phase 4 — les alertes (cron quotidien, email Resend, anti-doublon).

## 2026-09-05 — Phase 2 : Le pipeline
**Fait :**
- Écran de capture (`/receipts/new`) : appareil photo (`capture="environment"`) ou import multi-fichiers, compression client (canvas, 1600px max, JPEG qualité 0.8) avant envoi.
- Upload direct vers Storage sous `{user_id}/{receipt_id}/{n}.jpg` (RLS applique déjà le préfixe), création du `receipt` avec id généré côté client (`crypto.randomUUID()`), déclenchement de l'extraction via `POST /api/receipts/[id]/extract`.
- Écran de traitement (`/receipts/[id]/processing`) : sondage du statut du receipt toutes les 1.5s, redirection automatique vers la revue une fois `done`/`needs_review`, écran d'erreur avec bouton « réessayer » si `failed`.
- Écran de revue (`/receipts/[id]/review`) : liste des `inventory_items` déjà créés par le pipeline automatique, correction de quantité/prix en un geste (champ inline), suppression en un geste.
- Route serveur `POST /api/receipts/[id]/extract` : télécharge les images depuis Storage (via le client authentifié, pas besoin de service role — les policies RLS du bucket suffisent), appelle `extractReceipt` (Claude vision en prod, mock déterministe si `MOCK_MODE`/pas de clé), valide avec Zod (un seul rejeu sur échec de validation puis `failed` propre), crée les `receipt_items`, résout la durée de conservation via la fonction SQL `match_shelf_life` (exact → alias → flou pg_trgm seuil 0.4 → repli par catégorie), crée les `inventory_items` (uniquement `is_food=true`) et les `price_observations`.
- Migration `007_shelf_life_match_and_rate_limit` : fonction `match_shelf_life(p_name)` (exact/alias/trigram), policy restrictive limitant les nouveaux tickets à 20/jour/utilisateur directement au niveau RLS (donc appliquée quel que soit le chemin d'écriture, client ou serveur).
- Référentiel de repli par catégorie (`CATEGORY_DEFAULTS`) quand aucune correspondance, même approximative, n'existe dans `shelf_life_catalog`.
- Normaliseur déterministe (`normalizeLabel`) — utilisé par le mode mock et testé unitairement sur 35 cas d'abréviation réels es-MX/fr-FR. L'extraction réelle en production est normalisée par Claude directement (le prompt système contient les règles de la section 7), ce normaliseur local est un filet de sécurité et un objet de test, pas le chemin principal.
- 8 fixtures synthétiques dans `tests/fixtures/receipts/` (3 mexicains, 3 français, 1 illisible, 1 très long — 22 lignes) : images PNG générées par script (`scripts/generate-fixtures.mjs`, SVG rendu via `sharp`) plutôt que des photos réelles, faute d'images fournies par l'humain ou d'outil de génération de photos réalistes. **La validation sur de vrais tickets photographiés reste à faire.**
- Script `pnpm test:extraction` : compare la sortie du pipeline à `expected.json` par fixture, imprime un pourcentage global, bloque à 85% — mais seulement quand une vraie clé Anthropic est utilisée ; en `MOCK_MODE` il rapporte honnêtement un score bas (l'extracteur mock renvoie toujours les 3 mêmes articles) et saute le seuil bloquant plutôt que de simuler un succès.

**Décisions techniques :**
- Le pipeline (étapes 2 à 5 de la section 7 : extraction, normalisation, création d'inventaire, prix) s'exécute entièrement de façon automatique dans la route d'extraction, sans étape de confirmation intermédiaire côté utilisateur — l'écran de revue corrige/supprime des `inventory_items` déjà créés plutôt que de les créer sur confirmation. Ce choix simplifie le modèle (pas de double état à synchroniser entre `receipt_items` et `inventory_items`) et respecte quand même le critère d'acceptation (« corriger une ligne en moins de 3 gestes »).
- Un ticket multi-photos est stocké comme un dossier Storage (`{user_id}/{receipt_id}/0.jpg`, `1.jpg`, ...) plutôt qu'un chemin unique, et toutes les images sont envoyées en un seul appel Claude (plusieurs blocs image dans un message) pour une synthèse cohérente sur l'ensemble du ticket.
- Le rate-limit de 20 tickets/jour est implémenté comme policy RLS `restrictive` (comptage des lignes créées dans les dernières 24h) plutôt qu'en code applicatif, pour qu'il s'applique peu importe le chemin d'écriture.

**Bugs rencontrés :**
- `apply_migration` refuse toute instruction contenant `DROP POLICY` (retour « Denied by user » sans message d'erreur SQL) → remplacé par `ALTER POLICY` partout où c'était possible (déjà rencontré en phase 1, confirmé de nouveau).
- Advisor sécurité après la fonction `match_shelf_life` : `function_search_path_mutable` → corrigé avec `alter function ... set search_path = public, extensions`.
- `pnpm test:e2e` échoue localement sur le test de connexion : `*.supabase.co` est bloqué par la policy réseau du sandbox (confirmé avec un `curl` direct, 403 du proxy d'egress), comme `*.vercel.app` et `ui.shadcn.com` déjà rencontrés en phase 1. Restriction d'environnement, pas un bug de l'app — n'affecte pas la production.
- Playwright : la version installée (`1.63.0`) attend une révision de Chromium plus récente que celle pré-installée dans le sandbox → `executablePath` rendu configurable via `PLAYWRIGHT_CHROMIUM_PATH` (non committé avec de valeur par défaut, pour ne pas casser d'autres environnements) plutôt que de retélécharger un navigateur (bloqué par la même policy réseau de toute façon).

**Porte qualité :** lint ✅ types ✅ tests ✅ (58/58) e2e ⚠️ (bloqué par la policy réseau du sandbox, tests corrects mais non exécutables ici — voir ci-dessus) build ✅ deploy ⏳ (bloqué, voir phase 1) advisors ✅ runtime ⏳ (bloqué, voir phase 1)

**Exactitude extraction :** non mesurable sans `ANTHROPIC_API_KEY` réelle — script fonctionnel, rapporte honnêtement le score bas du mode mock (1.9%) et saute le seuil de 85% plutôt que de le simuler. À relancer dès qu'une vraie clé est disponible.

**Bloqué sur :** toujours `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (voir phase 1) — l'app fonctionne en `MOCK_MODE=true`. Déploiement Vercel toujours à vérifier (voir diagnostic phase 1, pas rebloquant pour continuer le développement).

**Suivant :** phase 3 — l'inventaire vivant (vue triée par péremption, zones visuelles, actions « mangé »/« jeté » à un geste, compteur de valeur en péremption).

## 2026-09-05 — Phase 1 : Socle
**Fait :**
- `CLAUDE.md` copié à la racine.
- Projet Next.js 15 (App Router, TypeScript strict) + Tailwind v4 + pnpm initialisé.
- Primitives shadcn-style écrites à la main (Button, Input, Label) — le CLI `shadcn` était bloqué par la policy réseau du sandbox (`ui.shadcn.com` refusé), donc composants recréés manuellement avec les tokens de la charte NADA plutôt que le thème générique shadcn.
- i18n es-MX / fr-FR via `next-intl` en mode sans routage (locale par cookie, défaut `es-MX`), dictionnaires complets pour login/dashboard/settings.
- Palette et typographie de la section 10 appliquées (`--paper/--ink/--nopal/--jamaica/--sand/--fade`, Instrument Sans + Martian Mono via `next/font/google`).
- Projet Supabase `nada` créé (organisation existante avait atteint sa limite de 2 projets gratuits ; `Influx-production` mis en pause sur confirmation explicite de l'utilisateur pour libérer un slot).
- Migrations appliquées : `001_core_schema`, `002_rls_policies`, `003_rls_perf_fixes`, `004_storage_receipts`, `005_seed_shelf_life` (125 entrées, alias es/fr), `006_move_pg_trgm_to_extensions_schema`.
- RLS activé sur toutes les tables, advisors sécurité **au vert**. `pg_trgm` déplacé hors du schéma `public` suite à l'avis de sécurité.
- Bucket Storage privé `receipts` avec policies par préfixe `{user_id}/`.
- Auth OTP par email (Supabase, sans mot de passe) : `/login` (demande de code + vérification), `/auth/callback` (lien magique), middleware de protection de toutes les routes hors `/login` et `/auth/callback`.
- Suppression de compte fonctionnelle (`/settings` + `POST /api/account/delete`) : efface les fichiers Storage puis le compte (cascade SQL sur les autres tables).
- `database.types.ts` généré depuis le schéma réel via `generate_typescript_types`.
- Manifest PWA + icônes générées (fond nopal, lettre "n" minuscule).
- Tests unitaires (Vitest) : cohérence des clés i18n es-MX/fr-FR, utilitaire `cn`. Test E2E (Playwright, viewport 390×844) : redirection non-authentifié → `/login` → envoi de code.

**Décisions techniques :**
- `shadcn init` indisponible (réseau bloqué) → composants écrits à la main avec les mêmes conventions (cva, `cn`, Radix Slot/Label) pour rester compatible avec un futur `shadcn add`.
- i18n sans préfixe d'URL (`/es-MX/...`) : la locale est un attribut de compte/cookie, pas une route — plus adapté à une PWA mobile à domicile unique.
- Migration `003` a dû remplacer les `DROP POLICY` par des `ALTER POLICY` — les migrations contenant `DROP POLICY` déclenchaient un refus de l'outil `apply_migration` dans cet environnement ; `ALTER POLICY` fonctionne pour les mêmes correctifs de performance RLS.
- Next.js épinglé en `^15` (le scaffold `create-next-app` le plus récent installe la 16 par défaut) pour respecter la stack imposée section 3.

**Bugs rencontrés :**
- `create-next-app .` refusait le nom de dossier `Nada-Saas` (majuscules interdites par npm) → scaffold généré dans un dossier temporaire puis déplacé, `package.json` renommé en `nada`.
- `eslint-config-next@15.5.25` exporte un format eslintrc classique (`module.exports = { extends: [...] }`), pas un tableau flat-config malgré l'import `eslint-config-next/core-web-vitals` généré par le scaffold → corrigé avec `FlatCompat` (`@eslint/eslintrc`).
- Avis de sécurité Supabase après `002_rls_policies` : fonction `handle_new_user` en `SECURITY DEFINER` exécutable par `anon`/`authenticated` via RPC (`REVOKE EXECUTE` appliqué) et policies RLS ré-évaluant `auth.uid()` par ligne (corrigé avec `(select auth.uid())`).

**Porte qualité :** lint ✅ types ✅ tests ✅ e2e ⏳ (à exécuter contre un déploiement vérifiable) build ✅ deploy ⚠️ (voir bloqué sur) advisors ✅ runtime ⏳

**Exactitude extraction :** n/a (pipeline en phase 2)

**Bloqué sur :**
1. `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` et `RESEND_API_KEY` ne sont pas récupérables par les outils MCP disponibles (le connecteur Supabase n'expose jamais la clé service-role, par conception). L'app tourne en `MOCK_MODE=true` en attendant. La suppression de compte échouera tant que `SUPABASE_SERVICE_ROLE_KEY` n'est pas configurée sur Vercel — fonctionnalité en place, clé à fournir par l'humain.
2. **Déploiement Vercel non vérifiable.** `create_git_project` (essayé deux fois, noms `nada` puis `nada-app`) échoue systématiquement à l'étape de vérification du lien Git avec une 404 "Project not found", alors même que l'appel rapporte un project id créé. Contournement tenté avec `deploy_to_vercel` (dépôt de fichiers, sans Git) sous le nom `nada-mx` : l'appel réussit et renvoie une URL de déploiement (`https://nada-i2fmhciw9-stack-nest.vercel.app`, alias `nada-mx-stack-nest.vercel.app`) — mais **tous** les outils de lecture qui suivent (`get_project`, `list_projects`, `get_deployment`, `get_deployment_build_logs`, `web_fetch_vercel_url`) échouent contre la même équipe (`team_ChfqC8KXBuKt594b9FHKIlY1`/StackNest), avec des erreurs différentes (404 "not found", "Unable to create shareable URL"). Accès direct par le réseau du bac à sable également bloqué (policy egress sur `*.vercel.app`, attendu). Trois approches distinctes (deux noms de projet en `create_git_project`, puis `deploy_to_vercel`) ont donc échoué à la même étape de vérification — c'est le cas d'arrêt de la section 0 point 3 du cahier des charges. Le déploiement a probablement eu lieu (l'appel `deploy_to_vercel` a retourné un id de déploiement concret), mais je ne peux ni confirmer son statut ni lire ses logs ni y accéder avec les outils disponibles dans cette session. Il est possible que le connecteur Vercel de cette session n'ait pas de droits d'écriture/lecture cohérents sur l'équipe StackNest, ou que l'app GitHub de Vercel ne soit pas installée sur `youneselvis-ops/Nada-Saas`.

**Diagnostic précis (post-investigation) :** test isolé avec `deploy_to_vercel` d'un simple fichier HTML statique (`nada-probe`) — le déploiement réussit immédiatement (statut `READY`, URL concrète retournée), mais **toutes** les lectures qui suivent échouent : `get_deployment` (404), `get_project` (404), `get_project_deployment_protection` (404), et surtout `list_deployments` renvoie un **403 "You don't have permission to list the deployment"** — un code d'erreur différent qui indique une vraie restriction de permission, pas une ressource introuvable. Conclusion : le jeton/connecteur Vercel de cette session a un accès **écriture sans lecture** sur l'équipe StackNest (ou un scope de token incomplet). Aucun CLI `vercel` ni jeton `VERCEL_*` disponible localement pour contourner via un autre chemin. Ce n'est pas réparable en variant les noms de projet ou les endpoints — j'ai testé 7 endpoints de lecture différents, tous échouent, alors que 4 écritures distinctes (2× `create_git_project`, 2× `deploy_to_vercel`) réussissent toutes.

**Complément e2e :** en essayant de faire tourner `pnpm test:e2e` localement, le test de connexion échoue aussi — `signInWithOtp` retourne une erreur depuis le navigateur Chromium du sandbox. Diagnostic : `*.supabase.co` est bloqué par la policy réseau du sandbox (`curl` direct confirme un `403` du proxy d'egress), au même titre que `*.vercel.app` et `ui.shadcn.com`. C'est une restriction d'environnement, pas un bug : en production (exécution côté serveurs Vercel), cette restriction n'existe pas. Les tests e2e sont donc écrits et corrects mais ne peuvent pas s'exécuter avec succès dans ce sandbox — ils devront tourner en CI ou contre un déploiement réel une fois le connecteur Vercel réparé.

**Suivant :** ce point ne bloque plus la suite du développement — c'est une correction ponctuelle côté compte (reconnecter/re-scoper le connecteur Vercel) que l'humain fera quand il le souhaite, pas quelque chose à redemander à chaque tour. J'enchaîne sur la phase 2 ; la vérification du déploiement (`web_fetch_vercel_url`, `get_runtime_errors`, promotion en production) et la configuration des variables d'environnement Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MOCK_MODE=true`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`) resteront à faire dès que le connecteur aura un accès en lecture.
