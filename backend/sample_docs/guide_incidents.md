# Guide de Résolution d'Incidents (Runbook)

Niveaux de criticité :
- P1 (Critique) : Service totalement indisponible pour tous les clients. SLA de réponse : 15 min.
- P2 (Majeur) : Fonctionnalité clé cassée, mais contournement possible. SLA de réponse : 1h.
- P3 (Mineur) : Bug non bloquant ou erreur d'affichage. SLA : 24h.

Lors d'un P1, un canal Slack temporaire #incident-{date} est créé. Le rôle d'Incident Commander est assigné à l'ingénieur d'astreinte. Un post-mortem blameless doit être rédigé sous 72h.
