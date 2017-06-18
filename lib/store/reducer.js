const combineReducers = require('redux').combineReducers;

const actions = require('./actions');

const defaultSteamIdsState = [];

function steamIds (state = defaultSteamIdsState, action) {
  switch (action.type) {
    case actions.SAVE_STEAM_ID:
      if (state.includes(action.steamId)) {
        return state;
      }
      return state.concat(action.steamId);
    case actions.SET_STEAM_IDS:
      return action.steamIds;
    case actions.DELETE_STEAM_ID: {
      const index = state.indexOf(action.steamId);
      if (index === -1) {
        return state;
      }
      return state.slice(0, index).concat(state.slice(index + 1));
    }
    default:
      return state;
  }
}

const defaultOwnedGamesDataState = {
  includedSteamIds: [],
  apps: {}
};

function ownedGamesData (state = defaultOwnedGamesDataState, action) {
  switch (action.type) {
    case actions.ADD_OWNED_GAMES_COLLECTION:
      if (state.includedSteamIds.includes(action.steamId)) {
        return state;
      }
      return {
        includedSteamIds: state.includedSteamIds.concat(action.steamId),
        apps: action.games ? action.games.reduce((acc, game) => {
          const app = acc[game.appid];
          if (app) {
            return Object.assign({}, acc, {
              [game.appid]: Object.assign({}, app, {
                playtime_forever: app.playtime_forever + game.playtime_forever,
                steam_ids: app.steam_ids.concat(action.steamId)
              })
            });
          }
          return Object.assign({}, acc, {
            [game.appid]: Object.assign({}, game, {
              steam_ids: [action.steamId]
            })
          });
        }, state.apps) : state.apps
      };
    case actions.CLEAR_OWNED_GAMES:
      return defaultOwnedGamesDataState;
    default:
      return state;
  }
}

const defaultSteamIdsPendingConfirmationState = {};

function steamIdsPendingConfirmation (state, action) {
  state = state || defaultSteamIdsPendingConfirmationState;
  switch (action.type) {
    case actions.SAVE_STEAM_ID_PENDING_CONFIRMATION:
      return Object.assign({}, state, {
        [action.token]: action.steamId
      });
    case actions.EXPIRE_STEAM_ID_PENDING_CONFIRMATION: {
      const obj = Object.assign({}, state);
      delete obj[action.token];
      return obj;
    }
    default:
      return state;
  }
}

const reducer = combineReducers({
  steamIds,
  ownedGamesData,
  steamIdsPendingConfirmation
});

module.exports = reducer;
