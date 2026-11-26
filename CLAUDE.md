# Agence mobile Pro — notes pour Claude

Appli de gestion pour points Mobile Money (Côte d'Ivoire / Afrique francophone). Interface et textes en **français**.

## Ce que c'est
- Appli web d'un seul fichier : `index.html` (HTML + CSS + JS, sans framework ni build).
- PWA : `manifest.webmanifest`, `sw.js` (cache `agence-pro-vN`, réseau d'abord ; incrémenter N à chaque changement).
- Bibliothèques locales : `supabase.js` (supabase-js 2.49.4 UMD), `xlsx.full.min.js` (SheetJS 0.18.5).
- En ligne : GitHub Pages, https://agre9279.github.io/agence-mobile-pr/ (dépôt AGRE9279/agence-mobile-pr, branche main, racine). Un push sur main met le site à jour.
- En local : `lancer.bat` (python -m http.server 8081).

## Serveur : Supabase, projet « agence-mobile-pro » (ref hpnunfiytwhwbipyihls, région eu-central-1)
- Config dans index.html : `SB_URL`, `SB_KEY` (clé publishable, publique par nature).
- Tables (schéma public) : `am_agences`, `am_membres` (rôle proprietaire|agent), `am_operations`, `am_jours` (ouverture, comptage, clôture).
- RLS partout ; fonctions d'aide security definer dans le schéma `am_priv` (am_est_membre, am_est_proprio, am_jour_clos).
- Triggers : `am_apres_agence` (le créateur devient propriétaire), `am_avant_operation` (remplit agent_id / agent_nom).
- Règles : un agent ne supprime que ses opérations d'une journée ouverte ; personne ne saisit sur une journée clôturée ; seul le propriétaire rouvre.
- Temps réel sur am_operations et am_jours.
- Edge function `am-comptes` (verify_jwt false, auth vérifiée dans le code) : actions inscription, creer_agent, mot_de_passe, activer.
- Les agents se connectent avec un pseudo-e-mail `<identifiant>@agents.example.com`.
- Inscription publique Supabase non utilisée par l'appli (comptes créés par la fonction).

## Abonnements (migrations am_abonnements, am_abonnements_droits_lecture)
- Tables : `am_abonnements` (un par propriétaire : fin, formule essai|pro), `am_paiements` (historique), `am_admins` (fournisseur de l'appli, sans politique : accès par fonctions seulement).
- Essai de 30 jours créé par le trigger `am_essai_abonnement` à la création d'un point.
- `am_priv.am_abo_ok(agence, jour)` : saisie permise si jour <= fin et aujourd'hui <= fin + 2 (délai pour la file hors ligne). Ajouté aux politiques d'insertion/suppression d'opérations et d'écriture des journées. Lecture et exports restent permis.
- RPC : `am_abo_statut(a)` (membres), `am_suis_admin()`, `am_admin_clients()`, `am_admin_prolonger(p, mois, montant, moyen, reference)` (admin ; prolonge depuis max(fin, aujourd'hui)).
- Côté appli : constante `ABO` (tarifs, `payerWa`, `payerNum`), bandeau d'alerte (rappel 5 jours avant), section « Mon abonnement » dans les réglages, onglet « Administration » visible des admins.
- Ajouter un admin : `insert into am_admins(user_id) select id from auth.users where email = '...'`.

## Fonctionnement hors ligne
File d'attente `am-outbox` dans localStorage (UUID générés côté client), envoyée à l'événement `online` et toutes les 20 s.

## Autres fichiers
- `Guide-utilisation-Pro.pdf` (mode d'emploi), `Fiche-presentation.pdf` (fiche commerciale), `LISEZ-MOI.txt`.
- Offre gratuite Supabase : 2 projets actifs max, pause après 7 jours d'inactivité.
