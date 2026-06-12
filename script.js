import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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
const addPlayerButton = document.querySelector("#add-player-button");
const emptyMessage = document.querySelector("#empty-message");
const saveStatus = document.querySelector("#save-status");
const cardTemplate = document.querySelector("#player-card-template");

const addPlayerDialog = document.querySelector("#add-player-dialog");
const addPlayerForm = document.querySelector("#add-player-form");
const newScreenName = document.querySelector("#new-screen-name");
const newCategory = document.querySelector("#new-category");
const newNotes = document.querySelector("#new-notes");
const addPlayerError = document.querySelector("#add-player-error");
const saveNewPlayerButton = document.querySelector(
  "#save-new-player-button"
);
const closeDialogButton = document.querySelector(
  "#close-dialog-button"
);
const cancelAddButton = document.querySelector(
  "#cancel-add-button"
);

let players = [];
let currentUser = null;
let unsubscribePlayers = null;

const saveTimers = new Map();

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error(
    "Could not set authentication persistence:",
    error
  );
});

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

    if (addPlayerDialog.open) {
      addPlayerDialog.close();
    }
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  const email = document
    .querySelector("#email")
    .value
    .trim();

  const password = document
    .querySelector("#password")
    .value;

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    loginForm.reset();
  } catch (error) {
    console.error("Sign-in failed:", error);

    loginError.textContent =
      "Sign-in failed. Check your email and password.";
  }
});

signOutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not sign out:", error);

    saveStatus.textContent =
      "Could not sign out.";
  }
});

function playersCollection(uid) {
  return collection(
    db,
    "users",
    uid,
    "players"
  );
}

function subscribeToPlayers(uid) {
  unsubscribePlayers = onSnapshot(
    playersCollection(uid),

    (snapshot) => {
      players = snapshot.docs.map((playerDocument) => ({
        id: playerDocument.id,
        ...playerDocument.data()
      }));

      players.sort((playerA, playerB) => {
        const nameA = playerA.screenName || "";
        const nameB = playerB.screenName || "";

        return nameA.localeCompare(nameB);
      });

      renderPlayers();

      saveStatus.textContent = "";
    },

    (error) => {
      console.error("Could not load notes:", error);

      saveStatus.textContent =
        `Could not load notes: ${error.message}`;
    }
  );
}

function openAddPlayerDialog() {
  addPlayerForm.reset();

  newCategory.value = "uncategorized";
  addPlayerError.textContent = "";

  addPlayerDialog.showModal();
  newScreenName.focus();
}

function closeAddPlayerDialog() {
  if (addPlayerDialog.open) {
    addPlayerDialog.close();
  }

  addPlayerForm.reset();

  addPlayerError.textContent = "";
}

async function createPlayer(event) {
  event.preventDefault();

  if (!currentUser) {
    addPlayerError.textContent =
      "You must be signed in to add a note.";

    return;
  }

  const screenName = newScreenName.value.trim();
  const category = newCategory.value;
  const notes = newNotes.value;

  if (!screenName) {
    addPlayerError.textContent =
      "Enter a screen name.";

    newScreenName.focus();

    return;
  }

  const duplicateExists = players.some((player) => {
    const existingName = player.screenName || "";

    return (
      existingName.trim().toLowerCase() ===
      screenName.toLowerCase()
    );
  });

  if (duplicateExists) {
    addPlayerError.textContent =
      "A player with that screen name already exists.";

    newScreenName.focus();

    return;
  }

  saveNewPlayerButton.disabled = true;
  saveNewPlayerButton.textContent = "Saving...";
  addPlayerError.textContent = "";

  try {
    await addDoc(
      playersCollection(currentUser.uid),
      {
        screenName,
        screenNameLower: screenName.toLowerCase(),
        category,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    closeAddPlayerDialog();

    saveStatus.textContent = "Note added.";

    window.setTimeout(() => {
      if (saveStatus.textContent === "Note added.") {
        saveStatus.textContent = "";
      }
    }, 1800);
  } catch (error) {
    console.error("Could not create player:", error);

    addPlayerError.textContent =
      `Could not save note: ${error.message}`;
  } finally {
    saveNewPlayerButton.disabled = false;
    saveNewPlayerButton.textContent = "Save Note";
  }
}

function schedulePlayerUpdate(
  playerId,
  changes,
  statusElement
) {
  const existingTimer = saveTimers.get(playerId);

  window.clearTimeout(existingTimer);

  statusElement.textContent = "Saving...";

  const timer = window.setTimeout(async () => {
    if (!currentUser) {
      statusElement.textContent = "Not signed in";

      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "players",
          playerId
        ),
        {
          ...changes,
          updatedAt: serverTimestamp()
        }
      );

      statusElement.textContent = "Saved";

      window.setTimeout(() => {
        if (statusElement.textContent === "Saved") {
          statusElement.textContent = "";
        }
      }, 1400);
    } catch (error) {
      console.error("Could not save player:", error);

      statusElement.textContent =
        `Save failed: ${error.message}`;
    } finally {
      saveTimers.delete(playerId);
    }
  }, AUTOSAVE_DELAY);

  saveTimers.set(playerId, timer);
}

async function deletePlayer(playerId) {
  const player = players.find(
    (item) => item.id === playerId
  );

  const playerName =
    player?.screenName?.trim() || "this player";

  const confirmed = window.confirm(
    `Delete all notes for ${playerName}? ` +
    "This cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  if (!currentUser) {
    saveStatus.textContent =
      "You must be signed in to delete a note.";

    return;
  }

  try {
    await deleteDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "players",
        playerId
      )
    );
  } catch (error) {
    console.error("Could not delete player:", error);

    saveStatus.textContent =
      `Could not delete note: ${error.message}`;
  }
}

function getFilteredPlayers() {
  const searchText = playerSearch.value
    .trim()
    .toLowerCase();

  return players.filter((player) => {
    const screenName = player.screenName || "";

    return (
      searchText === "" ||
      screenName
        .toLowerCase()
        .startsWith(searchText)
    );
  });
}

function buildPlayerCard(player) {
  const fragment =
    cardTemplate.content.cloneNode(true);

  const card =
    fragment.querySelector(".player-card");

  const screenNameInput =
    fragment.querySelector(".screen-name-input");

  const categorySelect =
    fragment.querySelector(".category-select");

  const notesInput =
    fragment.querySelector(".notes-input");

  const deleteButton =
    fragment.querySelector(".delete-button");

  const cardSavedStatus =
    fragment.querySelector(".card-saved-status");

  card.dataset.playerId = player.id;

  card.dataset.category =
    player.category || "uncategorized";

  screenNameInput.value =
    player.screenName || "";

  categorySelect.value =
    player.category || "uncategorized";

  notesInput.value =
    player.notes || "";

  screenNameInput.addEventListener(
    "input",
    (event) => {
      const screenName = event.target.value;

      schedulePlayerUpdate(
        player.id,
        {
          screenName,
          screenNameLower:
            screenName.trim().toLowerCase()
        },
        cardSavedStatus
      );
    }
  );

  categorySelect.addEventListener(
    "change",
    (event) => {
      const newCategoryValue =
        event.target.value;

      card.dataset.category =
        newCategoryValue;

      schedulePlayerUpdate(
        player.id,
        {
          category: newCategoryValue
        },
        cardSavedStatus
      );
    }
  );

  notesInput.addEventListener(
    "input",
    (event) => {
      schedulePlayerUpdate(
        player.id,
        {
          notes: event.target.value
        },
        cardSavedStatus
      );
    }
  );

  deleteButton.addEventListener(
    "click",
    () => {
      deletePlayer(player.id);
    }
  );

  return fragment;
}

function renderPlayers() {
  playerGrid.innerHTML = "";

  const filteredPlayers =
    getFilteredPlayers();

  filteredPlayers.forEach((player) => {
    playerGrid.appendChild(
      buildPlayerCard(player)
    );
  });

  emptyMessage.hidden =
    filteredPlayers.length !== 0;
}

addPlayerButton.addEventListener(
  "click",
  openAddPlayerDialog
);

addPlayerForm.addEventListener(
  "submit",
  createPlayer
);

closeDialogButton.addEventListener(
  "click",
  closeAddPlayerDialog
);

cancelAddButton.addEventListener(
  "click",
  closeAddPlayerDialog
);

playerSearch.addEventListener(
  "input",
  renderPlayers
);

addPlayerDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === addPlayerDialog) {
      closeAddPlayerDialog();
    }
  }
);
