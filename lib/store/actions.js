const SAVE_STEAM_ID = '@@sgp/SAVE_STEAM_ID';
const SET_STEAM_IDS = '@@sgp/SET_STEAM_IDS';
const DELETE_STEAM_ID = '@@sgp/DELETE_STEAM_ID';
const ADD_OWNED_GAMES_COLLECTION = '@@sgp/ADD_OWNED_GAMES_COLLECTION';
const CLEAR_OWNED_GAMES = '@@sgp/CLEAR_OWNED_GAMES';
const SAVE_STEAM_ID_PENDING_CONFIRMATION = '@@sgp/SAVE_STEAM_ID_PENDING_CONFIRMATION';
const EXPIRE_STEAM_ID_PENDING_CONFIRMATION = '@@sgp/EXPIRE_STEAM_ID_PENDING_CONFIRMATION';

function saveSteamId (steamId) {
  return {
    type: SAVE_STEAM_ID,
    steamId
  };
}

function setSteamIds (steamIds) {
  return {
    type: SET_STEAM_IDS,
    steamIds
  };
}

function deleteSteamId (steamId) {
  return {
    type: DELETE_STEAM_ID,
    steamId
  };
}

function addOwnedGamesCollection (steamId, games) {
  return {
    type: ADD_OWNED_GAMES_COLLECTION,
    steamId,
    games
  };
}

function clearOwnedGames () {
  return {
    type: CLEAR_OWNED_GAMES
  };
}

function saveSteamIdPendingConfirmation (steamId, token) {
  return {
    type: SAVE_STEAM_ID_PENDING_CONFIRMATION,
    steamId,
    token
  };
}

function expireSteamIdPendingConfirmation (token) {
  return {
    type: EXPIRE_STEAM_ID_PENDING_CONFIRMATION,
    token
  };
}

module.exports = {
  SAVE_STEAM_ID,
  DELETE_STEAM_ID,
  ADD_OWNED_GAMES_COLLECTION,
  CLEAR_OWNED_GAMES,
  SAVE_STEAM_ID_PENDING_CONFIRMATION,
  EXPIRE_STEAM_ID_PENDING_CONFIRMATION,
  saveSteamId,
  setSteamIds,
  deleteSteamId,
  addOwnedGamesCollection,
  clearOwnedGames,
  saveSteamIdPendingConfirmation,
  expireSteamIdPendingConfirmation
};
