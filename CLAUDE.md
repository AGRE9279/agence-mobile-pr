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

## Rapport admin WhatsApp (migration am_rapport_whatsapp)
- Tâche pg_cron `am-rapport-matin`, `0 7 * * *` (7 h Abidjan = UTC), qui appelle `am_priv.am_envoyer_rapport()`. Celle-ci envoie par pg_net un GET vers TextMeBot (`api.textmebot.com/send.php`).
- Texte : `am_priv.am_rapport_texte(date)`, aperçu sans envoi avec `select am_priv.am_rapport_texte(current_date)`. Contenu : suivi des clients seulement (jamais leurs caisses), plus un bilan de la semaine le lundi.
- Secrets Vault : `textmebot_apikey`, `rapport_destinataire` (+22595955803, format 8 chiffres exigé par TextMeBot).
- Réponses d'envoi : table `net._http_response`.
- TextMeBot est payant après l'essai (offre « 1 recipient » à 1 $/mois).
- Une tâche cloud Claude (trig_01VJE2RCdtPz5WwJX236L8tS) a été essayée puis désactivée : le proxy cloud bloque api.textmebot.com.

## Boutique (migrations am_boutique, am_rapport_boutique)
- `am_agences.momo` / `am_agences.boutique` : activités du point (au moins une, contrainte). Côté appli : classes `.mm` (Mobile Money) et `.bq` (boutique), visibilité calculée dans `renderHeader`.
- Tables : `am_produits` (prix de vente et d'achat, stock, seuil d'alerte, actif), `am_clients` (crédit), `am_ventes` (lignes en jsonb `[{p,q,pu}]`, mode especes|mobile|credit, paye = espèces reçues), `am_entrees` (réapprovisionnement ou perte si q < 0, de_caisse), `am_remboursements`.
- Triggers : `am_avant_vente` recalcule total, coût, noms et prix d'achat depuis le catalogue (le total envoyé par le client est ignoré). `am_stock_vente` et `am_stock_entree` tiennent le stock, y compris à la suppression. Les autres triggers `am_avant_*` remplissent agent_id / agent_nom et vérifient le point.
- Droits : le catalogue (produits) est réservé au propriétaire. Ventes, entrées et remboursements suivent les mêmes règles que les opérations (journée ouverte, abonnement valide, un agent ne supprime que ses saisies). Les clients sont créés par les membres.
- Caisse : `calcB()` ajoute à la caisse les ventes en espèces, les acomptes de crédit et les remboursements en espèces, et retire les achats payés par la caisse. Une seule caisse et une seule clôture par point.
- Tarif : `am_priv.am_tarif(proprietaire)` donne 5 000 F par point Mobile Money (4 000 F dès 3 points) et 3 000 F par boutique seule. Renvoyé par `am_abo_statut` (`tarif`) et `am_admin_tarifs()`.
- Données de démo : DEMO Cocody (Mobile Money + boutique, 10 produits de papeterie, client « Client démo »).

## Limite du connecteur Supabase dans cet éditeur
Les commandes destructives (DELETE, DROP) passées par execute_sql ou apply_migration sont refusées automatiquement (la confirmation n'est pas prise en charge). Préférer `create or replace` et de nouvelles fonctions. Pour supprimer des données, l'utilisateur doit passer par l'éditeur SQL de Supabase.

## Fonctionnement hors ligne
File d'attente `am-outbox` dans localStorage (UUID générés côté client), envoyée à l'événement `online` et toutes les 20 s. Chaque élément porte `t` (table) : absent = `am_operations` (compatibilité), sinon am_ventes, am_entrees, am_remboursements ou am_clients.

## Autres fichiers
- `Guide-utilisateurs.pdf` (mode d'emploi pour les clients : propriétaires et agents), `Fiche-presentation.pdf` (fiche commerciale), `LISEZ-MOI.txt`.
- Offre gratuite Supabase : 2 projets actifs max, pause après 7 jours d'inactivité.
