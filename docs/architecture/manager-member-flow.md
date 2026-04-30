# Manager / Member Flow

## Manager
- crée un compte entreprise
- obtient un profil `manager`
- peut générer jusqu'à 10 accès membres
- voit uniquement les données de son équipe
- assigne des prospects aux membres
- suit l'évolution de toute l'activité de son équipe

## Member
- reçoit un accès généré par le manager
- active l'accès via l'écran d'activation
- utilise un identifiant au format `PrenomNom@Entreprise`
- définit son mot de passe lors de l'activation
- son activité est visible par le manager lié

## Isolation des données
Un manager ne doit jamais voir les données d'une autre équipe.