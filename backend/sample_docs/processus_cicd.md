# Processus de Déploiement CI/CD

Notre pipeline CI/CD est basé sur GitHub Actions.
Il y a 3 environnements :
1. Dev : Déploiement automatique à chaque push sur la branche `develop`.
2. Staging : Déploiement manuel via tag ou release candidate, pour les tests d'intégration et QA.
3. Prod : Déploiement soumis à validation manuelle de 2 approbateurs après succès des tests E2E. 
Règle d'or : On ne déploie jamais en production le vendredi après 15h.
