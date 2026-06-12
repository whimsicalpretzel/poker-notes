import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const AUTOSAVE_DELAY = 700;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginView = document.querySelector("#login-view");
const notesView = document.querySelector("#notes-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const signOutButton = document.querySelector("#sign-out-button");
const playerGrid = document.querySelector("#player-grid");
const playerSearch = document.querySelector("#player-search");
const categoryFilter = document.querySelector("#category-filter");
const addPlayerButton = document.querySelector("#add-player-button");
const emptyMessage = document.querySelector("#empty-message");
const saveStatus = document.querySelector("#save-status");
const cardTemplate = document.querySelector("#player-card-template");

let players = [];
let currentUser = null;
let unsubscribePlayers = null;
const saveTimers = new Map();

await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (unsubscribePlayers) {
    unsubscribePlayers();
    unsubscribePlayers = null;
  }

  if (user) {
    loginView.hidden = true;
    notesView.hidden = false;
    subscribeToPlayers(user.uid);
  } else {
    players = [];
    renderPlayers();
    notesView.hidden = true;
    loginView.hidden = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    console.error(error);
    loginError.textContent = "Sign-in failed. Check your email and password.";
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut(auth);
});

function playersCollection(uid) {
  return collection(db, "users", uid, "players");
}

function subscribeToPlayers(uid) {
  unsubscribePlayers = onSnapshot(
    playersCollection(uid),
    (snapshot) => {
      players = snapshot.docs.map((playerDoc) => ({
        id: playerDoc.id,
        ...playerDoc.data()
      }));

      players.sort((a, b) =>
        (a.screenName || "").localeCompare(b.screenName || "")
      );

      renderPlayers();
      saveStatus.textContent = "";
    },
    (error) => {
      console.error("Could not load notes:", error);
      saveStatus.textContent = "Could not load notes. Check Firebase setup.";
    }
  );
}

async function createPlayer() {
  if (!currentUser) return;

  try {
    const newDoc = await addDoc(playersCollection(currentUser.uid), {
      screenName: "",
      screenNameLower: "",
      category: "uncategorized",
      notes: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    window.setTimeout(() => {
      document
        .querySelector(`[data-player-id="${newDoc.id}"] .screen-name-input`)
        ?.focus();
    }, 150);
  } catch (error) {
    console.error("Could not create player:", error);
    saveStatus.textContent = "Could not create note.";
  }
}

function schedulePlayerUpdate(id, changes, statusElement) {
  const existingTimer = saveTimers.get(id);
  window.clearTimeout(existingTimer);

  statusElement.textContent = "Saving...";

  const timer = window.setTimeout(async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "players", id), {
        ...changes,
        updatedAt: serverTimestamp()
      });
      statusElement.textContent = "Saved";

      window.setTimeout(() => {
        if (statusElement.textContent === "Saved") {
          statusElement.textContent = "";
        }
      }, 1400);
    } catch (error) {
      console.error("Could not save player:", error);
      statusElement.textContent = "Save failed";
    } finally {
      saveTimers.delete(id);
    }
  }, AUTOSAVE_DELAY);

  saveTimers.set(id, timer);
}

async function deletePlayer(id) {
  const player = players.find((item) => item.id === id);
  const playerName = player?.screenName?.trim() || "this player";

  if (!window.confirm(`Delete all notes for ${playerName}? This cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "players", id));
  } catch (error) {
    console.error("Could not delete player:", error);
    saveStatus.textContent = "Could not delete note.";
  }
}

function getFilteredPlayers() {
  const searchText = playerSearch.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  return players.filter((player) => {
    const screenName = player.screenName || "";
    const matchesSearch =
      searchText === "" || screenName.toLowerCase().startsWith(searchText);

    const matchesCategory =
      selectedCategory === "all" || player.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

function buildPlayerCard(player) {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".player-card");
  const screenNameInput = fragment.querySelector(".screen-name-input");
  const categorySelect = fragment.querySelector(".category-select");
  const notesInput = fragment.querySelector(".notes-input");
  const deleteButton = fragment.querySelector(".delete-button");
  const cardSavedStatus = fragment.querySelector(".card-saved-status");

  card.dataset.playerId = player.id;
  card.dataset.category = player.category || "uncategorized";
  screenNameInput.value = player.screenName || "";
  categorySelect.value = player.category || "uncategorized";
  notesInput.value = player.notes || "";

  screenNameInput.addEventListener("input", (event) => {
    const screenName = event.target.value;
    schedulePlayerUpdate(
      player.id,
      {
        screenName,
        screenNameLower: screenName.trim().toLowerCase()
      },
      cardSavedStatus
    );
  });

  categorySelect.addEventListener("change", (event) => {
    card.dataset.category = event.target.value;
    schedulePlayerUpdate(
      player.id,
      { category: event.target.value },
      cardSavedStatus
    );
  });

  notesInput.addEventListener("input", (event) => {
    schedulePlayerUpdate(
      player.id,
      { notes: event.target.value },
      cardSavedStatus
    );
  });

  deleteButton.addEventListener("click", () => deletePlayer(player.id));

  return fragment;
}

function renderPlayers() {
  playerGrid.innerHTML = "";
  const filteredPlayers = getFilteredPlayers();

  filteredPlayers.forEach((player) => {
    playerGrid.appendChild(buildPlayerCard(player));
  });

  emptyMessage.hidden = filteredPlayers.length !== 0;
}

addPlayerButton.addEventListener("click", createPlayer);
playerSearch.addEventListener("input", renderPlayers);
categoryFilter.addEventListener("change", renderPlayers);
