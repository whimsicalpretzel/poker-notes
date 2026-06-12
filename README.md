# Poker Opponent Notes — Firebase Version

This version saves notes in Cloud Firestore and uses Firebase Email/Password Authentication. Notes sync between devices after you sign in.

## Files

- `index.html` — page structure
- `styles.css` — layout and colors
- `script.js` — authentication, Firestore syncing, search, editing, and deletion
- `firebase-config.js` — your Firebase web app configuration
- `firestore.rules` — Firestore access rules
- `.gitignore` — basic Git exclusions

## 1. Create a Firebase project

1. Open the Firebase Console.
2. Choose **Create a project**.
3. After the project is created, choose **Add app** and select the Web icon.
4. Register the app. Firebase Hosting is optional because GitHub Pages can host the frontend.
5. Copy the `firebaseConfig` object Firebase gives you.
6. Open `firebase-config.js` and replace the placeholder values.

The Firebase web configuration is not a password. Your Firestore Security Rules control database access.

## 2. Create the Firestore database

1. In Firebase Console, open **Build > Firestore Database**.
2. Choose **Create database**.
3. Choose a location.
4. Start in production mode.

## 3. Enable sign-in

1. Open **Build > Authentication**.
2. Select **Get started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. Open the **Users** tab.
5. Add your one user account manually with your email and a strong password.
6. Copy that user's UID from the Users table.

The website deliberately does not include a public sign-up button.

## 4. Install the Firestore rules

1. Open `firestore.rules`.
2. Replace `YOUR_FIREBASE_USER_UID` with the UID copied above.
3. In Firebase Console, open **Firestore Database > Rules**.
4. Paste the rules and publish them.

These rules allow only that exact Firebase account to read and change notes.

## 5. Test locally

Because the JavaScript uses modules, do not test by double-clicking `index.html`.

From the project folder, run one of these:

### Python

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

### VS Code

Use the Live Server extension and open `index.html`.

## 6. Upload to GitHub

Upload the individual files to the root of your repository. Do not upload only the ZIP.

For GitHub Pages:

1. Open repository **Settings > Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

## Important

- Commit `firebase-config.js`; Firebase's browser configuration is expected to be visible in frontend applications.
- Never put service-account credentials, private keys, or Admin SDK credentials in this repository.
- Firestore and Authentication have usage limits and pricing. This small personal project should use very little, but review your Firebase usage dashboard.
