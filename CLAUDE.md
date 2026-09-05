# NADA — Cahier des charges d'exécution autonome
### Document destiné à Claude Code. À lire intégralement avant toute action.
---
## 0. COMMENT UTILISER CE DOCUMENT
Tu es l'ingénieur unique de ce projet. Tu construis, tu testes, tu déploies, tu vérifies, tu corriges. Tu ne demandes pas de validation entre chaque étape.
**Copie ce document à la racine du projet sous le nom `CLAUDE.md`** dès la première commande, puis relis-le au début de chaque phase.
**Tu t'arrêtes pour demander à l'humain UNIQUEMENT dans ces 4 cas :**
1. Il te manque un secret (clé API, identifiant) que tu ne peux pas générer toi-même.
2. Une action coûte de l'argent et nécessite une confirmation explicite (création de projet Supabase payant, domaine).
3. Tu as échoué 3 fois de suite sur le même bug après trois approches différentes.
4. Une décision produit contredit ce document.
Dans **tous les autres cas**, tu décides, tu exécutes, tu vérifies, tu continues.
---
## 1. LE PRODUIT
**NADA** transforme un ticket de caisse en inventaire alimentaire vivant.
L'utilisateur photographie son ticket. L'application extrait les produits, estime leurs dates de péremption, prévient avant qu'ils ne périment, propose quoi cuisiner avec ce qui va mourir, et affiche chaque mois combien d'argent a été sauvé.
**La promesse tient en une phrase : l'utilisateur ne saisit jamais rien à la main.**
C'est le point le plus important du produit. Toute la catégorie (KitchenPal, Samsung Food, Mealime) échoue parce qu'elle demande à l'utilisateur de saisir son garde-manger. Si à un moment de ton implémentation l'utilisateur doit taper le contenu de son frigo, tu as construit le mauvais produit.
**Marchés :** Mexique (es-MX) en priorité, France (fr-FR) en second. L'anglais n'est pas nécessaire.
**Plateforme :** PWA mobile-first. Pas d'app native. Utilisable à une main, debout dans une cuisine.
---
## 2. RÈGLES D'OR NON NÉGOCIABLES
1. **Rien n'est terminé tant que ce n'est pas déployé et vérifié en ligne.** Une fonctionnalité qui compile en local n'est pas livrée.
2. **Aucun secret dans le code, aucun secret dans Git.** `SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` ne sortent jamais du serveur.
3. **RLS activé sur toutes les tables, sans exception.** Une table sans politique RLS est une fuite de données.
4. **TypeScript strict.** `any` est interdit sauf commentaire justifiant sur la ligne.
5. **Tu écris le test avant de considérer une fonction comme finie.** Pas de TDD dogmatique, mais aucune logique métier sans test.
6. **Tu ne construis rien qui figure en section 14 (hors périmètre).** Même si ça te semble une bonne idée.
7. **Tu tiens un journal.** Voir section 15.
8. **Tu utilises les connecteurs MCP disponibles (Supabase, Vercel) plutôt que des commandes manuelles** dès que c'est possible.
---
## 3. STACK IMPOSÉE
| Couche | Choix | Raison |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Déploiement Vercel natif |
| Style | Tailwind CSS v4 + shadcn/ui | Rapidité, composants accessibles |
| Base de données | Supabase Postgres | Connecteur MCP disponible |
| Auth | Supabase Auth — OTP par email + magic link | Pas de mot de passe |
| Stockage images | Supabase Storage, bucket privé `receipts` | |
| Extraction ticket | API Anthropic, modèle vision, côté serveur uniquement | |
| Hébergement | Vercel | Connecteur MCP disponible |
| Tâches planifiées | Vercel Cron | |
| Email | Resend | |
| Tests unitaires | Vitest | |
| Tests E2E | Playwright | |
| Gestionnaire de paquets | pnpm | |
Ne substitue aucun élément de cette liste sans raison technique bloquante, et documente-la dans le journal si tu le fais.
---
## 4. UTILISATION DES CONNECTEURS MCP
### 4.1 Supabase
Séquence obligatoire au démarrage :
1. `list_organizations` puis `list_projects` — vérifie si un projet NADA existe déjà. **Ne crée jamais un doublon.**
2. Si aucun projet : `get_cost` → `confirm_cost` → `create_project` (région la plus proche du Mexique disponible).
3. `get_project_url` et `get_publishable_keys` pour construire le `.env.local`.
4. Chaque changement de schéma passe par `apply_migration` avec un nom explicite (`001_core_schema`, `002_rls_policies`…). **Jamais de DDL via `execute_sql`.**
5. `execute_sql` est réservé aux seeds et aux vérifications de données.
6. Après **chaque** migration : `get_advisors` en mode sécurité **et** performance. Tu corriges tout ce qui remonte avant de passer à la suite. Un avis de sécurité ignoré est un bug bloquant.
7. `generate_typescript_types` après chaque migration, écrit dans `src/lib/database.types.ts`.
8. `search_docs` avant d'inventer une syntaxe Supabase que tu n'es pas sûr de connaître.
### 4.2 Vercel
1. Le code vit dans un dépôt Git. Utilise `create_git_project` pour le relier. `deploy_to_vercel` seulement si aucun dépôt distant n'est utilisable.
2. Variables d'environnement configurées côté Vercel, jamais commitées.
3. Après chaque déploiement : `get_deployment` pour l'état, puis `get_deployment_build_logs` **même en cas de succès** — tu lis les avertissements.
4. `web_fetch_vercel_url` sur l'URL de preview pour vérifier que la page répond bien en 200 et que le HTML contient ce que tu attends.
5. 10 minutes après chaque déploiement de production : `get_runtime_errors` puis `get_runtime_logs`. Toute erreur récurrente est traitée avant de passer à la phase suivante.
6. `search_vercel_documentation` pour la configuration Cron plutôt que de deviner.
---
## 5. VARIABLES D'ENVIRONNEMENT
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # serveur uniquement
ANTHROPIC_API_KEY=              # serveur uniquement
RESEND_API_KEY=                 # serveur uniquement
CRON_SECRET=                    # généré par toi, protège les routes cron
NEXT_PUBLIC_SITE_URL=
```
Crée un `.env.example` complet, sans valeurs. Ajoute `.env*.local` au `.gitignore` en première action.
Si `ANTHROPIC_API_KEY` ou `RESEND_API_KEY` manquent : construis quand même, avec un mode `MOCK_MODE=true` qui renvoie des extractions factices depuis les fixtures. Ne bloque jamais l'avancement sur une clé manquante.
---
## 6. MODÈLE DE DONNÉES
Migration `001_core_schema`. Tous les identifiants en `uuid`, toutes les dates en `timestamptz`.
```sql
-- Profil utilisateur
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  locale text not null default 'es-MX',
  currency text not null default 'MXN',
  household_size int not null default 2,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);
-- Ticket de caisse
create table receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  image_path text not null,
  store_name text,
  purchased_at date,
  total_amount numeric(10,2),
  currency text not null default 'MXN',
  status text not null default 'pending'
    check (status in ('pending','processing','done','failed','needs_review')),
  extraction_raw jsonb,
  extraction_confidence numeric(3,2),
  error_message text,
  created_at timestamptz not null default now()
);
-- Ligne brute du ticket
create table receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts on delete cascade,
  raw_label text not null,
  normalized_name text,
  category text,
  quantity numeric(10,3) not null default 1,
  unit text not null default 'unit',
  unit_price numeric(10,2),
  total_price numeric(10,2),
  is_food boolean not null default true,
  confidence numeric(3,2)
);
-- Référentiel de durées de conservation
create table shelf_life_catalog (
  normalized_name text primary key,
  category text not null,
  default_storage text not null check (default_storage in ('fridge','pantry','freezer')),
  days_fridge int,
  days_pantry int,
  days_freezer int,
  aliases text[] not null default '{}'
);
-- Inventaire vivant
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  receipt_item_id uuid references receipt_items on delete set null,
  product_name text not null,
  category text,
  quantity numeric(10,3) not null default 1,
  unit text not null default 'unit',
  value_amount numeric(10,2) not null default 0,
  storage text not null default 'fridge',
  purchased_at date not null,
  expires_at date not null,
  status text not null default 'active'
    check (status in ('active','consumed','wasted','discarded_expired')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
-- Historique de prix, alimenté à chaque ticket
create table price_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  normalized_name text not null,
  store_name text,
  unit_price numeric(10,2) not null,
  unit text not null,
  observed_at date not null,
  created_at timestamptz not null default now()
);
-- Traçabilité des notifications, anti-doublon
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  payload jsonb,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, (payload->>'dedupe_key'))
);
```
**Index obligatoires :** `inventory_items(user_id, status, expires_at)`, `receipts(user_id, created_at desc)`, `price_observations(user_id, normalized_name, observed_at desc)`, `receipt_items(receipt_id)`.
**Migration `002_rls_policies` :** RLS activé partout. Politique unique par table sur `auth.uid() = user_id` pour select/insert/update/delete. Pour `receipt_items`, la politique passe par une jointure sur `receipts.user_id`. `shelf_life_catalog` est en lecture publique authentifiée, écriture service role uniquement.
**Bucket Storage `receipts` :** privé. Chemin `{user_id}/{receipt_id}.jpg`. Politique : l'utilisateur ne lit et n'écrit que sous son propre préfixe. Accès aux images via URL signée de 60 secondes, jamais publique.
---
## 7. LE PIPELINE CŒUR
C'est 80 % de la valeur du produit. Traite-le avec le plus grand soin.
### Étape 1 — Upload
Compression côté client à 1600 px de large maximum, qualité 0.8, avant envoi. Un ticket long peut être photographié en plusieurs images rattachées au même `receipt`.
### Étape 2 — Extraction
Route serveur `POST /api/receipts/[id]/extract`. Appelle l'API Anthropic en vision avec l'image et exige une sortie JSON stricte, sans texte autour.
Schéma de sortie attendu :
```json
{
  "store_name": "string|null",
  "purchased_at": "YYYY-MM-DD|null",
  "currency": "MXN|EUR",
  "total_amount": "number|null",
  "confidence": 0.0,
  "items": [
    {
      "raw_label": "string",
      "normalized_name": "string",
      "category": "produce|dairy|meat|fish|bakery|frozen|pantry|beverage|household|other",
      "quantity": 1,
      "unit": "unit|kg|g|l|ml",
      "unit_price": 0.0,
      "total_price": 0.0,
      "is_food": true,
      "confidence": 0.0
    }
  ]
}
```
Règles d'extraction à inscrire dans le prompt système :
- Les abréviations de caisse doivent être développées (`JIT TOM 1KG` → `jitomate`). Le champ `normalized_name` est **toujours en minuscules, sans accent, au singulier, en espagnol pour es-MX et en français pour fr-FR**.
- Les articles non alimentaires (produits ménagers, sacs, consigne) sont conservés avec `is_food: false`.
- Les remises, sous-totaux, TVA et lignes de fidélité sont ignorés.
- Si un champ est illisible, `null` — **jamais d'invention**. Une valeur inventée est pire qu'une valeur manquante.
- `confidence` global sous 0.6 → statut `needs_review`, l'utilisateur confirme dans l'interface.
Parsing avec Zod. Une réponse non conforme déclenche **un seul** rejeu avec le message d'erreur de validation, puis échec propre en `failed`.
### Étape 3 — Normalisation
Chaque `normalized_name` est rapproché de `shelf_life_catalog` : correspondance exacte, puis alias, puis correspondance floue (trigram `pg_trgm`, seuil 0.4). Sans correspondance, on applique la durée par défaut de la catégorie.
### Étape 4 — Création de l'inventaire
`expires_at = purchased_at + days_{storage}`. Seuls les articles `is_food = true` entrent dans l'inventaire.
### Étape 5 — Prix
Chaque ligne avec un `unit_price` alimente `price_observations`. Dès qu'un produit a 3 observations ou plus, calcule la variation entre la première et la dernière et expose-la.
**Objectif de qualité mesurable :** sur le jeu de fixtures, **au moins 85 % des lignes alimentaires** correctement extraites (libellé + prix + quantité). En dessous, tu itères sur le prompt avant de passer à la phase suivante.
---
## 8. RÉFÉRENTIEL DE CONSERVATION (seed initial)
Seed `003_seed_shelf_life` avec au minimum 120 entrées couvrant le panier mexicain et français courant. Base de départ, en jours :
| Produit | Stockage | Jours |
|---|---|---|
| épinards, salade, herbes fraîches | frigo | 4 |
| tomate, jitomate | frigo | 7 |
| avocat, aguacate | ambiant | 5 |
| banane, plátano | ambiant | 6 |
| pomme, manzana | frigo | 21 |
| carotte, zanahoria | frigo | 21 |
| pomme de terre, papa | ambiant | 45 |
| oignon, cebolla | ambiant | 45 |
| lait ouvert, leche | frigo | 5 |
| yaourt, yogur | frigo | 14 |
| fromage frais, queso fresco | frigo | 7 |
| œufs, huevo | frigo | 28 |
| poulet cru, pollo | frigo | 2 |
| bœuf haché, carne molida | frigo | 2 |
| poisson frais, pescado | frigo | 2 |
| jambon, jamón | frigo | 5 |
| pain, pan, tortilla | ambiant | 3 |
| riz, arroz | ambiant | 730 |
| pâtes, pasta | ambiant | 730 |
| haricots secs, frijol | ambiant | 730 |
| conserves | ambiant | 730 |
| surgelés | congélateur | 180 |
Complète cette table toi-même jusqu'à 120 lignes minimum, avec les alias es/fr dans le tableau `aliases`. Reste conservateur : mieux vaut alerter un jour trop tôt qu'un jour trop tard.
---
## 9. FONCTIONNALITÉS ET PHASES
Chaque phase se termine par la porte qualité de la section 12. Tu ne commences pas la phase suivante avant de l'avoir franchie.
### Phase 1 — Socle (déployé en ligne à la fin)
- Projet Next.js, Tailwind, shadcn/ui, i18n es-MX/fr-FR
- Supabase créé, migrations 001-003 appliquées, advisors au vert
- Auth OTP email, page de connexion, middleware de protection des routes
- Déploiement Vercel fonctionnel avec URL de preview vérifiée
- **Critère d'acceptation :** un utilisateur se connecte par email sur l'URL déployée et atteint un tableau de bord vide.
### Phase 2 — Le pipeline
- Écran de capture : appareil photo ou import, multi-images, compression client
- Upload vers Storage, création du `receipt`, déclenchement de l'extraction
- Écran de traitement avec état en temps réel
- Écran de revue : liste des articles extraits, correction et suppression possibles en un geste
- **Critère d'acceptation :** un ticket réel photographié produit un inventaire correct à 85 % ou plus sur les fixtures, et l'utilisateur peut corriger une ligne en moins de 3 gestes.
### Phase 3 — L'inventaire vivant
- Vue inventaire triée par date de péremption croissante
- Trois zones visuelles : périme sous 48 h / sous 5 jours / plus tard
- Actions à un geste : « mangé » et « jeté » (c'est la **seule** saisie manuelle autorisée du produit)
- Compteur permanent de la valeur de ce qui est en train de périmer
- **Critère d'acceptation :** marquer un article prend un seul appui, sans confirmation.
### Phase 4 — Les alertes
- Cron Vercel quotidien à 17 h heure locale de l'utilisateur
- Sélection des articles expirant sous 48 h, groupés en une seule notification par utilisateur et par jour
- Email transactionnel Resend + notification web push si autorisée
- Anti-doublon strict via `notifications_log`
- **Critère d'acceptation :** aucun utilisateur ne reçoit deux notifications le même jour, jamais.
### Phase 5 — La recette anti-gaspi
- Bouton « Que faire avec ça ? » sur le groupe d'articles qui périment
- Génération d'une recette utilisant **uniquement** les articles de l'inventaire, plus une liste courte de basiques supposés présents (huile, sel, poivre, ail, oignon, riz, œufs)
- Temps de préparation affiché, 30 minutes maximum
- Mise en cache par combinaison d'ingrédients pour maîtriser le coût
- **Critère d'acceptation :** la recette ne mentionne jamais un ingrédient absent de l'inventaire hors liste de basiques. C'est un test automatisé, pas une vérification visuelle.
### Phase 6 — Le bilan mensuel
- Écran « Ce mois-ci » : valeur sauvée, valeur jetée, top 3 des produits gaspillés, variation de prix des 5 produits les plus achetés
- Export image partageable, format vertical 1080×1920, généré côté serveur
- Email récapitulatif le 1er du mois
- **Critère d'acceptation :** l'image exportée est lisible sans zoom sur un téléphone.
---
## 10. DIRECTION ARTISTIQUE
Le sujet, c'est le ticket de caisse et la nourriture périssable. Le design vient de là, pas d'un kit SaaS générique.
**Ce qui est interdit** parce que c'est le défaut de tout ce qui est généré aujourd'hui : fond crème avec accent terre cuite, fond noir avec vert acide, tout le contenu découpé en cartes arrondies identiques avec la même ombre grise, étiquettes en majuscules espacées au-dessus de chaque titre, flèches « → » ajoutées aux boutons, dégradés décoratifs.
**Palette :**
```
--paper    #FBFAF6   fond, la couleur du papier thermique neuf
--ink      #16211C   texte, un noir très légèrement vert
--nopal    #2F6B4F   vert profond — la valeur sauvée, les actions positives
--jamaica  #A3123A   rouge sombre — l'urgence de péremption, jamais décoratif
--sand     #E9E3D6   surfaces secondaires, séparateurs
--fade     #8C8B84   texte secondaire
```
La couleur porte de l'information : le rouge n'apparaît **que** pour ce qui périme sous 48 h. S'il apparaît ailleurs, il ne veut plus rien dire.
**Typographie :** deux familles seulement. `Instrument Sans` pour toute l'interface. `Martian Mono` **exclusivement** à l'intérieur du composant qui affiche le ticket extrait — c'est le vernaculaire du ticket de caisse, c'est justifié à cet endroit et nulle part ailleurs. Casse de phrase partout, aucune majuscule décorative.
**Le geste fort, dépensé une seule fois :** le montant sauvé du mois, en très grand, sur l'écran d'accueil. Traitement habituellement générique, mais ici c'est littéralement la raison d'être du produit et la métrique que l'utilisateur vient chercher. Tout le reste de l'interface est calme, dense, sans ornement.
**Structure de l'inventaire :** pas une grille de cartes. Une liste dense, comme un ticket, avec une règle horizontale fine entre les articles et la date de péremption alignée à droite. La densité est une fonctionnalité — l'utilisateur doit voir 12 articles sans faire défiler.
**Mouvement :** uniquement en réponse à une action. Quand un article est marqué « mangé », il quitte la liste avec une transition courte qui montre ce qui a changé. Aucune animation à l'apparition des sections.
**Écrans vides :** une invitation à agir, jamais une illustration décorative. « Aucun ticket pour l'instant. Photographie le prochain en sortant du magasin. »
**Plancher de qualité, sans l'annoncer :** cible tactile de 44 px minimum, focus clavier visible, `prefers-reduced-motion` respecté, contraste AA vérifié, utilisable à une main sur un écran de 375 px.
---
## 11. TESTS
### Fixtures
Crée `tests/fixtures/receipts/` avec au minimum 8 tickets : 3 mexicains (grande surface, supérette, marché), 3 français, 1 illisible, 1 très long. Si l'humain n'a pas fourni d'images, génère des tickets synthétiques réalistes et note dans le journal que la validation sur tickets réels reste à faire.
### Unitaires (Vitest)
- Normalisation de libellés : 30 cas d'abréviations réelles
- Calcul de `expires_at` sur tous les modes de stockage
- Validation Zod du schéma d'extraction, dont 5 payloads malformés
- Calcul des agrégats du bilan mensuel
- Anti-doublon des notifications
- Contrôle de la recette : **aucun ingrédient hors inventaire**
### Intégration
- Pipeline complet en mode mock, du fichier au `inventory_items`
- Politiques RLS : un utilisateur A ne peut lire aucune donnée d'un utilisateur B. Ce test est obligatoire et non négociable.
### E2E (Playwright, viewport mobile 390×844)
1. Inscription par OTP → tableau de bord
2. Upload d'un ticket → revue → inventaire peuplé
3. Marquer « mangé » → l'article disparaît, le compteur bouge
4. Correction d'une ligne mal extraite
5. Consultation du bilan mensuel
### Exactitude de l'extraction
Script `pnpm test:extraction` qui compare la sortie sur chaque fixture à un fichier de vérité `expected.json` et imprime un pourcentage. **Seuil bloquant : 85 %.**
---
## 12. PORTE QUALITÉ — à franchir à la fin de chaque phase
Exécute dans cet ordre. Si une étape échoue, tu corriges et tu recommences depuis le début de la liste.
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```
Puis :
1. Déploiement (preview d'abord).
2. `get_deployment_build_logs` — tu lis les avertissements, même en succès.
3. `web_fetch_vercel_url` sur l'URL de preview — statut 200 et contenu attendu présent.
4. `get_advisors` Supabase, sécurité **et** performance — zéro avis non traité.
5. Promotion en production.
6. `get_runtime_errors` après 10 minutes.
7. Entrée dans le journal.
**Une phase déclarée terminée sans ces 7 étapes est une phase non terminée.**
---
## 13. PROTOCOLE DE DÉBOGAGE AUTONOME
Quand quelque chose casse :
1. **Reproduis** avant de corriger. Un bug non reproduit est une hypothèse.
2. **Lis les logs réels** — `get_deployment_build_logs`, `get_runtime_logs`, la console navigateur — avant de supposer la cause.
3. **Écris un test qui échoue** et qui capture le bug.
4. **Corrige la cause, pas le symptôme.** Un `try/catch` vide autour d'une erreur n'est pas une correction, c'est une dissimulation.
5. **Vérifie que le test passe**, puis relance la suite complète pour détecter les régressions.
6. **Note-le dans le journal** avec la cause racine en une phrase.
Après 3 tentatives infructueuses avec 3 approches différentes, tu t'arrêtes et tu expliques à l'humain : ce que tu as essayé, ce que tu observes, ce dont tu as besoin.
---
## 14. HORS PÉRIMÈTRE — à ne construire sous aucun prétexte
- Scan de codes-barres
- Base de recettes propriétaire ou catalogue de recettes
- Suivi calorique, nutritionnel, ou toute donnée de santé
- Fonctions sociales, partage entre utilisateurs, commentaires
- Intégration frigo connecté ou objets connectés
- Chatbot cuisine généraliste
- Paiement et abonnement (viendra après la validation, pas maintenant)
- Application native iOS ou Android
- Tableau de bord administrateur
- Mode hors ligne complet
Si tu as une bonne idée qui n'est pas dans ce document, écris-la dans `IDEAS.md` et continue ce qui est prévu.
---
## 15. JOURNAL DE BORD
Maintiens `PROGRESS.md` à la racine. Une entrée à la fin de chaque phase et après chaque bug significatif :
```markdown
## [date] — Phase N : titre
**Fait :** ...
**Décisions techniques :** ... (et pourquoi)
**Bugs rencontrés :** symptôme → cause racine → correction
**Porte qualité :** lint ✅ types ✅ tests ✅ e2e ✅ build ✅ deploy ✅ advisors ✅ runtime ✅
**Exactitude extraction :** XX %
**Bloqué sur :** rien / description précise
**Suivant :** ...
```
---
## 16. SÉCURITÉ ET DONNÉES PERSONNELLES
- Un ticket de caisse est une donnée personnelle sensible : il révèle où quelqu'un vit, quand il sort, ce qu'il consomme. Traite-le comme tel.
- Images en bucket privé, URL signées à 60 secondes, jamais d'URL publique.
- Suppression de compte fonctionnelle dès la phase 1 : elle efface les lignes **et** les fichiers Storage.
- Aucune donnée utilisateur dans les logs. Jamais de contenu de ticket dans un message d'erreur.
- Limitation de débit sur les routes d'extraction : 20 tickets par utilisateur et par jour.
- Rejette tout fichier hors `image/jpeg`, `image/png`, `image/webp`, ou dépassant 10 Mo, côté serveur — pas seulement côté client.
---
## 17. PREMIÈRE COMMANDE À EXÉCUTER
Ne demande rien. Commence par :
1. Copier ce document en `CLAUDE.md` à la racine.
2. Créer `.gitignore` avec `.env*.local`, `node_modules`, `.next`.
3. Initialiser le projet Next.js + TypeScript + Tailwind + pnpm.
4. `list_projects` sur Supabase pour vérifier l'existant.
5. Créer `PROGRESS.md` avec la première entrée.
6. Enchaîner la phase 1 jusqu'à la porte qualité.
Puis continuer, phase après phase, sans interruption, jusqu'à la phase 6.
---
## 18. LA QUESTION À TE POSER À CHAQUE ÉCRAN
> *Est-ce que l'utilisateur doit taper quelque chose ?*
Si la réponse est oui en dehors de la connexion et des deux boutons « mangé » et « jeté », l'écran est mal conçu. Reprends-le.
