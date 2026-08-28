# Demande d'accès pour le déploiement AWS

Bonjour,

Afin de pouvoir finaliser le déploiement du projet RAG Bedrock OpenSearch sur AWS et réaliser les tests réels, j'ai besoin des accès et configurations suivants sur le compte de stage (Région `eu-west-1` - Irlande).

| Ressource | Pourquoi | Niveau d'accès minimal | Bloquant si absent ? |
|---|---|---|---|
| **Compte AWS / IAM** | Exécuter Terraform et déployer les ressources. | Accès programmatique (Access Key/Secret Key) avec les droits de création (ou rôle `AdministratorAccess` / `PowerUserAccess` sur le sous-compte). | **OUI** |
| **Amazon Bedrock** | Permettre l'utilisation de Claude 3 et Titan. | Activation manuelle dans la console (Model Access) pour `Anthropic Claude 3 Haiku` et `Amazon Titan Embeddings v2`. | **OUI** (les API renverront une erreur d'accès) |
| **OpenSearch Serverless** | Héberger l'index vectoriel. | Droits de création de collection (`aoss:*`). | **OUI** |
| **S3, API GW, Cognito** | Stockage, API, Authentification. | Droits standards de création via IAM (`s3:*`, `apigateway:*`, `cognito-idp:*`). | **OUI** |
| **Budget & Billing** | Éviter les dépassements de coûts imprévus. | Autorisation de configurer une alerte budget et validation pour détruire les ressources après test. | NON (mais fortement recommandé) |
| **Outils de gestion** | Gestion du code et suivi des tâches. | Accès au board Miro, Jira, et droits en push sur le repo GitHub. | **OUI** |

**Documents d'entreprise :**
Enfin, je souhaiterais obtenir quelques documents internes anonymisés (PDF/Markdown) pour alimenter la base de connaissances et rendre la démo plus réaliste.

Merci d'avance pour le déblocage de ces accès.
