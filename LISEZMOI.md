# Book funnel « Nutrition Antifragile » : mise en ligne

## Contenu du dossier

```
book-funnel/
├── index.html            ← la landing page (mobile first)
├── assets/couverture.jpg ← couverture du livre
└── api/subscribe.js      ← envoie prénom + email à Systeme.io (fonction Vercel)
```

## Parcours du prospect

1. **Étape 1** : prénom + email dans le formulaire.
2. La page envoie le contact à Systeme.io et lui ajoute un tag.
3. **Étape 2** : le prospect voit « Merci {prénom} » et un bouton vers Amazon.
   Sur mobile, le lien ouvre directement l'appli Amazon si elle est installée.
4. Dans Systeme.io, le tag déclenche l'email qui envoie le guide offert.

## 1. Préparer Systeme.io (10 min)

1. **Créer le tag** : Contacts > Tags > « Créer » → `book-nutrition-antifragile`.
   Notez son **ID numérique** : il apparaît en général dans l'URL quand on
   modifie le tag. Sinon, une fois la clé API créée (étape 4) :
   `curl -H "X-API-Key: VOTRE_CLE" https://api.systeme.io/api/tags`
2. **Créer l'email de livraison du guide** : Emailing > Campagnes (ou une
   séquence d'1 email), avec le lien de téléchargement du guide PDF et un
   rappel vers Amazon.
3. **Créer la règle d'automatisation** : Automatisations > Règles > Créer
   - Déclencheur : **Tag ajouté** → `book-nutrition-antifragile`
   - Action : **S'abonner à la campagne** (l'email du guide)
4. **Créer la clé API** : Paramètres > Clé API publique > Créer.
   ⚠️ Cette clé ne doit jamais être collée dans `index.html`.

## 2. Déployer sur Vercel

1. Mettre le dossier `book-funnel` dans le projet Vercel (ou un nouveau projet).
2. Vercel > Settings > **Environment Variables** :
   - `SYSTEMEIO_API_KEY` = la clé API publique
   - `SYSTEMEIO_TAG_ID` = l'ID numérique du tag
3. Redéployer (les variables ne sont prises en compte qu'au déploiement suivant).

## 3. Tester

1. Ouvrir la page sur un téléphone, s'inscrire avec un vrai email.
2. Vérifier dans Systeme.io : le contact existe, avec le prénom et le tag.
3. Vérifier la réception de l'email du guide.
4. Réessayer avec le même email : la page doit passer à l'étape 2 sans erreur
   (le contact existant est retrouvé et re-taggé).

En cas de problème : Vercel > Deployments > Functions > `api/subscribe` > Logs.

## Optionnel

- **Pixel Meta** : coller le code du pixel dans le `<head>`. L'événement `Lead`
  part automatiquement à chaque inscription réussie.
- **Photo de l'auteure** : ajouter `assets/alionka.jpg` et remplacer le fond de
  `.author-photo` dans le CSS.
- **Mentions légales / confidentialité** : renseigner les liens du pied de page
  (obligatoires dès qu'on collecte des emails).
