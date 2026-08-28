# Questions de test — Northwind Analytics

Jeu de questions prêtes à copier-coller pour tester l'application sur les 4 documents :
`politique_rh.pdf`, `securite_it.docx`, `notes_de_frais.xlsx`, `faq_support.md`.

Pour chaque question : la réponse attendue et la ou les sources.

---

## A. Questions faciles (un seul document)

| # | Question | Réponse attendue | Source |
|---|---|---|---|
| A1 | Combien de jours de congés payés par an pour un temps plein ? | 25 jours ouvrés (2,08 jours par mois) | PDF §1 |
| A2 | Quel est le délai minimum pour demander des congés ? | 15 jours calendaires (30 jours si absence > 10 jours ouvrés) | PDF §1 |
| A3 | Combien de jours pour un mariage ou un PACS ? | 4 jours ouvrés | PDF §2 |
| A4 | Quelle est la durée de la période d'essai d'un cadre ? | 4 mois, renouvelable une fois 4 mois | PDF §4 |
| A5 | Quelle est la longueur minimale d'un mot de passe ? | 14 caractères | Word §1 |
| A6 | La double authentification est-elle obligatoire ? | Oui, pour tous les salariés, sans exception | Word §2 |
| A7 | Au bout de combien de temps le poste se verrouille-t-il ? | 10 minutes d'inactivité | Word §3 |
| A8 | Quel est le plafond pour un repas du soir en déplacement ? | 35 € par repas | Excel, onglet Plafonds |
| A9 | Quel est le plafond d'une nuit d'hôtel en province ? | 110 € par nuit | Excel, onglet Plafonds |
| A10 | Quels sont les horaires du support informatique par téléphone ? | Lundi–vendredi, 9h00–18h00 | FAQ §1 |
| A11 | Quel est le délai de première réponse pour un incident P1 ? | 30 minutes | FAQ §2 |
| A12 | Qui est le RSSI ? | Marc Lefevre | Word §6 / FAQ §4 |

## B. Questions croisées (deux documents nécessaires)

| # | Question | Réponse attendue | Sources |
|---|---|---|---|
| B1 | Je dépose une note de frais de 780 €. Qui doit la valider et en combien de temps ? | Manager direct puis le Directeur Financier **Karim Belhadj** ; traitement en 8 jours ouvrés | Excel (seuil + délai) + PDF §5 (nom du valideur) |
| B2 | J'ai ouvert un courriel d'hameçonnage un dimanche. Que faire et qui appeler ? | Ne pas éteindre le poste, déconnecter du réseau, signaler dans l'heure ; appeler l'astreinte sécurité au **01 44 76 20 99** (24h/24) | Word §4 (procédure) + FAQ §1 (numéro) |
| B3 | Je télétravaille jeudi : combien de jours par semaine ai-je droit et que faut-il techniquement ? | Jusqu'à 3 jours par semaine (mardi obligatoire sur site) et connexion **via le VPN d'entreprise** | PDF §3 + Word §3 |
| B4 | Qui contacter pour une question de paie, et à quels horaires le support RH répond-il ? | Sophie Marchand (paie@northwind-analytics.fr) ; support RH lundi–vendredi 9h00–17h30 | PDF §6 + FAQ §1 |
| B5 | J'achète un écran à 280 € : est-ce dans le plafond, et qui valide ? | Oui (plafond 300 €, accord préalable du service informatique) ; sous 500 € → validation du manager direct | Excel + PDF §5 |
| B6 | J'ai perdu mon téléphone avec l'application 2FA. Quel délai et quel canal ? | Signalement au service informatique sous 24 heures ; support.it@northwind-analytics.fr / 01 44 76 20 40 | Word §2 + FAQ §1 et §3 |
| B7 | Une note de frais de 2 500 € : quel circuit et quel responsable financier ? | Directeur Financier (Karim Belhadj) + Direction générale ; 10 jours ouvrés | Excel onglet Validation + PDF §5 |
| B8 | Un incident de sécurité est-il prioritaire, et sous combien de temps est-il qualifié ? | Traité en P1 (réponse sous 30 min) ; qualifié par le RSSI sous 4 heures ouvrées | FAQ §2 + Word §4 |

## C. Questions avec des chiffres

| # | Question | Réponse attendue | Source |
|---|---|---|---|
| C1 | Quel est le taux kilométrique pour un véhicule 5 CV ? | 0,636 € / km | Excel, onglet Kilometres |
| C2 | Combien pour 1 200 km avec un 5 CV ? | 763,20 € (1 200 × 0,636) | Excel, calcul |
| C3 | Quel est le plafond annuel de kilomètres remboursables en voiture ? | 8 000 km | Excel |
| C4 | Quelle est l'indemnité mensuelle de télétravail ? | 30 € par mois (à partir de 8 jours télétravaillés dans le mois) | PDF §3 |
| C5 | Tous les combien renouvelle-t-on un mot de passe administrateur ? | Tous les 90 jours (180 jours pour un compte standard) | Word §1 |
| C6 | Combien de jours de congés peut-on reporter ? | 5 jours maximum, à utiliser avant le 31 mars | PDF §1 |
| C7 | Sous quel délai faut-il soumettre une note de frais ? | 60 jours après la dépense | Excel, onglet Regles |
| C8 | Combien de temps les journaux de connexion sont-ils conservés ? | 12 mois (sauvegardes : rétention 30 jours) | Word §5 |
| C9 | Quel est le plafond d'un repas d'affaires par convive ? | 70 € par convive | Excel |
| C10 | Délai de notification à la CNIL en cas de violation de données ? | 72 heures | Word §4 |
| C11 | Combien de jours de télétravail depuis l'étranger par an ? | 20 jours ouvrés, sur accord écrit de Claire Fontaine | PDF §3 |
| C12 | Quel est le taux pour un vélo personnel ? | 0,25 € / km, plafond 3 000 km | Excel |

## D. Questions pièges (réponse absente des documents)

L'application doit **reconnaître qu'elle ne sait pas** et créer une remarque plutôt qu'inventer.

| # | Question | Comportement attendu |
|---|---|---|
| D1 | Quel est le montant de la prime annuelle de fin d'année ? | Aucune information sur les primes dans les documents → remarque |
| D2 | Combien de jours de congé pour un salarié à mi-temps ? | Seul le temps plein est documenté (25 jours) → ne pas extrapoler, remarque |
| D3 | Quelle est la politique de l'entreprise sur les animaux au bureau ? | Sujet absent → remarque |
| D4 | Quel est le plafond de dépense pour un séminaire à l'étranger ? | Non documenté (seuls hôtel, avion, repas le sont) → remarque |
| D5 | Quel est le numéro de téléphone de Claire Fontaine ? | Seul le standard RH (01 44 76 20 10) existe ; pas de ligne directe → remarque |
| D6 | Quel antivirus est déployé sur les postes ? | Non mentionné (le chiffrement l'est, pas l'antivirus) → remarque |
| D7 | Combien de salariés compte Northwind Analytics ? | Absent des documents → remarque |
| D8 | Quel est le taux kilométrique pour un véhicule électrique ? | Le barème n'a pas de ligne « électrique » → remarque, ne pas inventer une majoration |
| D9 | Peut-on cumuler les congés reportés avec un congé sabbatique ? | Congé sabbatique jamais évoqué → remarque |
| D10 | Quelle est la durée de la période d'essai d'un stagiaire ? | Le tableau ne couvre que employé / agent de maîtrise / cadre → remarque |

## E. Contrôles de cohérence entre documents

| # | Vérification | Attendu |
|---|---|---|
| E1 | Le seuil de 500 € est-il le même partout ? | Oui : Excel (onglet Validation) et PDF §5 concordent |
| E2 | Les noms des responsables sont-ils identiques dans les 4 fichiers ? | Claire Fontaine, Marc Lefevre, Karim Belhadj, Sophie Marchand — orthographe identique |
| E3 | Le numéro d'astreinte sécurité apparaît-il ailleurs que dans la FAQ ? | Non : le Word y renvoie explicitement, sans le citer |
| E4 | Le VPN est-il exigé de façon cohérente ? | Oui : PDF §3 renvoie à la sécurité, Word §3 pose l'obligation |
