# Poker Opponent Notes

A simple personal poker opponent note application using:

- HTML
- CSS
- JavaScript
- Firebase Authentication
- Cloud Firestore

The site supports editable player cards, autosaving, category colors, live prefix search, category filtering, and syncing across devices.

## Project files

- `index.html` — page structure
- `styles.css` — layout and styling
- `script.js` — Firebase integration and application behavior
- `firebase-config.js` — Firebase browser configuration
- `firestore.rules` — Firestore access rules
- `.gitignore` — files Git should ignore

## Firebase setup already included

The Firebase web configuration has been added to `firebase-config.js`.

The Firestore rules have been restricted to this Firebase Authentication UID:

```text
s340Ue4RdxPig0j7DRP5FcKDaxF3
```

Before using the site, confirm that:

1. Email/Password authentication is enabled in Firebase Authentication.
2. Your Firebase user has the UID shown above.
3. The contents of `firestore.rules` have been pasted into **Firestore Database > Rules** and published.
4. A Cloud Firestore database has been created.

## Test locally

This project uses JavaScript modules, so run it through a local web server rather than double-clicking `index.html`.

From this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Upload to GitHub

Upload all project files to the root of a GitHub repository.

Example:

```text
poker-opponent-notes/
├── .gitignore
├── README.md
├── firebase-config.js
├── firestore.rules
├── index.html
├── script.js
└── styles.css
```

## Publish with GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch.
5. Select `/ (root)`.
6. Save.

## Security notes

The Firebase browser configuration in `firebase-config.js` is expected to be visible in a frontend application. It is not an administrative secret.

Do not commit any Firebase Admin SDK service-account JSON files, private keys, passwords, or `.env` files containing secrets.

Access to the notes is controlled by Firebase Authentication and the published Firestore Security Rules.
