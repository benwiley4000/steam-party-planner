// TODO: use 'request' module in place of fetch
// for low-latency streaming

require('dotenv-safe').load();

const path = require('path');
const createStore = require('redux').createStore;
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const compress = require('compression');
const fetch = require('node-fetch');

const resolveVanityName = require('./lib/steam-api/resolveVanityName');
const getPlayerSummaries = require('./lib/steam-api/getPlayerSummaries');
const getOwnedGames = require('./lib/steam-api/getOwnedGames');
const reducer = require('./lib/store/reducer');
const actions = require('./lib/store/actions');

const store = createStore(reducer);

const steamIdsPath = path.join(__dirname, 'steamids.json');

try {
  const steamIds = require(steamIdsPath);
  store.dispatch(actions.setSteamIds(steamIds));
} catch (e) {
  /* if the data is missing, the default is fine */
}

setTimeout(clearOwnedGames); // set default and cache expiry countdown

function dispatchSteamIdAction (actionCreator, id, callback) {
  const oldSteamIds = store.getState().steamIds;
  store.dispatch(actionCreator(id));
  const { steamIds } = store.getState();
  if (oldSteamIds === steamIds) {
    callback(); // no-op, but no need to return an error at this stage
    return;
  }
  fs.writeFile(steamIdsPath, JSON.stringify(steamIds), callback);
}

function saveSteamId (id, callback) {
  dispatchSteamIdAction(actions.saveSteamId, id, callback);
}

function deleteSteamId (id, callback) {
  dispatchSteamIdAction(actions.deleteSteamId, id, callback);
}

function compileOwnedGames (ownedGamesCollections) {
  for (const { steamId, games } of ownedGamesCollections) {
    store.dispatch(actions.addOwnedGamesCollection(steamId, games));
  }
}

let clearCacheTimeout;
function clearOwnedGames () {
  clearTimeout(clearCacheTimeout);
  store.dispatch(actions.clearOwnedGames());
  clearCacheTimeout = setTimeout(
    clearOwnedGames,
    process.env.CACHE_EXPIRATION_TIMEOUT
  );
}

function saveSteamIdPendingConfirmation (steamId, callback) {
  crypto.randomBytes(8, (err, buffer) => {
    if (err) {
      callback(err);
      return;
    }
    const token = buffer.toString('hex');
    store.dispatch(actions.saveSteamIdPendingConfirmation(steamId, token));
    setTimeout(() => {
      store.dispatch(actions.expireSteamIdPendingConfirmation(token));
    }, process.env.STEAM_ID_CONFIRMATION_TIMEOUT);
    callback(null, token);
  });
}

const app = express();
app.use(compress());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/players', (req, res) => {
  const { steamIds } = store.getState();
  getPlayerSummaries(steamIds).then(({ players: { player: players } }) => {
    res.json({
      players: players.filter(player => player)
    }).end();
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.get('/api/players/:steamId', (req, res) => {
  getPlayerSummaries([
    req.params.steamId
  ]).then(({ players: { player: players } }) => {
    const player = players[0];
    if (!player) {
      res.status(400).json({
        error: `Player with id ${req.params.steamId} not found`
      }).end();
      return;
    }
    res.json({ player }).end();
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.get('/api/owned-games', (req, res) => {
  const state = store.getState();
  const ownedGamesData = state.ownedGamesData;
  const steamIdsToFetch = state.steamIds.filter(id => {
    return !ownedGamesData.includedSteamIds.includes(id);
  });
  Promise.all(steamIdsToFetch.map(getOwnedGames)).then(responses => {
    const ownedGamesCollections = responses.map((r, index) => ({
      games: r.games,
      steamId: steamIdsToFetch[index]
    }));
    compileOwnedGames(ownedGamesCollections);
    const { apps } = store.getState().ownedGamesData;
    res.json({
      games: Object.keys(apps).map(appId => apps[appId])
    }).end();
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.post('/api/players/:vanityName', (req, res) => {
  resolveVanityName(req.params.vanityName).then(({ success, steamid }) => {
    if (success !== 1) {
      res.status(400).json({
        error: `Vanity name ${req.params.vanityName} not found`
      }).end();
      return;
    }
    return getPlayerSummaries([steamid]);
  }).then(({ players: { player: players } }) => {
    const player = players[0];
    if (!player) {
      res.status(400).json({
        error: `Vanity name ${req.params.vanityName} not found`
      }).end();
      return;
    }
    return new Promise((resolve, reject) => {
      saveSteamIdPendingConfirmation(player.steamid, (err, token) => {
        if (err) {
          reject(err);
          return;
        }
        res.json({
          player,
          confirmationUrl: `/api/confirm-player/${token}`
        }).end();
      });
    });
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.post('/api/confirm-player/:token', (req, res) => {
  const steamId = store.getState().steamIdsPendingConfirmation[req.params.token];
  if (!steamId) {
    res.status(410).json({ error: 'Confirmation url expired' }).end();
    return;
  }
  saveSteamId(steamId, (err) => {
    if (err) {
      res.status(500).json({ error: 'Server error' }).end();
      return;
    }
    res.status(200).json({}).end();
  });
});

app.delete('/api/players/:vanityName', (req, res) => {
  if (process.env.ENABLE_PLAYER_DELETE !== 'true') {
    res.status(403).json({ error: 'Method not allowed' }).end();
    return;
  }
  resolveVanityName(req.params.vanityName).then(({ success, steamid }) => {
    if (success !== 1) {
      res.status(400).json({
        error: `Vanity name ${req.params.vanityName} not found`
      }).end();
      return;
    }
    clearOwnedGames();
    return new Promise((resolve, reject) => {
      deleteSteamId(steamid, (err) => {
        if (err) {
          reject(err);
          return;
        }
        res.status(200).json({}).end();
      });
    });
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

const port = 9876;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
