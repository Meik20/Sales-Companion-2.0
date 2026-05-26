# Firebase Claims Notes

## Admin claims

Le rôle admin de sécurité repose sur les custom claims Firebase.

## Important

Après mise à jour des claims via Admin SDK :

- le token ID déjà présent côté client peut ne pas contenir immédiatement la nouvelle claim
- il faut forcer un refresh du token ou une reconnexion

## Effet

Sans refresh :

- l'UI peut voir un doc user admin
- mais les routes serveur protégées par la claim Firebase peuvent encore refuser l'accès
