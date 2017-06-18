// TODO: use 'request' module in place of fetch
// for low-latency streaming

require('dotenv-safe').load();

const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const compress = require('compression');
const path = require('path');
const fetch = require('node-fetch');

const resolveVanityName = require('./lib/steam-api/resolveVanityName');
const getPlayerSummaries = require('./lib/steam-api/getPlayerSummaries');
const getOwnedGames = require('./lib/steam-api/getOwnedGames');

const steamIdsPath = './steamids.json';
const defaultSteamIds = [];
let steamIds;
try {
  steamIds = require(steamIdsPath);
} catch (e) {
  steamIds = defaultSteamIds;
}

const ownedGamesDataPath = './ownedgamesdata.json';
const defaultOwnedGamesData = {
  includedSteamIds: [],
  apps: {}
};
let ownedGamesData;
try {
  ownedGamesData = require(ownedGamesDataPath);
} catch (e) {
  ownedGamesData = defaultOwnedGamesData;
}

function saveSteamId (id, callback) {
  if (steamIds.indexOf(id) !== -1) {
    callback(); // no-op, but no need to return an error at this stage
    return;
  }
  steamIds.push(id);
  fs.writeFile(steamIdsPath, JSON.stringify(steamIds), callback);
}

function deleteSteamId (id, callback) {
  const index = steamIds.indexOf(id);
  if (index === -1) {
    callback(); // no-op, but no need to return an error at this stage
    return;
  }
  steamIds.splice(index, 1);
  fs.writeFile(steamIdsPath, JSON.stringify(steamIds), callback);
}

function compileOwnedGames (ownedGamesCollections, callback) {
  for (const { steamId, games } of ownedGamesCollections) {
    ownedGamesData.includedSteamIds.push(steamId);
    if (!games) {
      continue;
    }
    for (const game of games) {
      if (game.appid in ownedGamesData.apps) {
        ownedGamesData.apps[game.appid].playtime_forever += game.playtime_forever;
        ownedGamesData.apps[game.appid].steam_ids.push(steamId);
      } else {
        ownedGamesData.apps[game.appid] = Object.assign({}, game, {
          steam_ids: [steamId]
        });
      }
    }
  }
  fs.writeFile(ownedGamesDataPath, JSON.stringify(ownedGamesData), callback);
}

function clearOwnedGames (callback) {
  ownedGamesData = defaultOwnedGamesData;
  fs.writeFile(ownedGamesDataPath, JSON.stringify(ownedGamesData), callback);
}

const steamIdsPendingConfirmation = {};

function saveSteamIdPendingConfirmation (steamId, callback) {
  crypto.randomBytes(8, (err, buffer) => {
    if (err) {
      callback(err);
      return;
    }
    const token = buffer.toString('hex');
    steamIdsPendingConfirmation[token] = steamId;
    setTimeout(() => {
      delete steamIdsPendingConfirmation[token];
    }, process.env.STEAM_ID_CONFIRMATION_TIMEOUT);
    callback(null, token);
  });
}

const app = express();
app.use(compress());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/players', (req, res) => {
  getPlayerSummaries(steamIds).then(({ players: { player: players } }) => {
    res.json({ players }).end();
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
  const steamIdsToFetch = steamIds.filter(id => {
    return !ownedGamesData.includedSteamIds.includes(id);
  });
  Promise.all(steamIdsToFetch.map(getOwnedGames)).then(responses => {
    const ownedGamesCollections = responses.map((r, index) => ({
      games: r.games,
      steamId: steamIdsToFetch[index]
    }));
    return new Promise((resolve, reject) => {
      compileOwnedGames(ownedGamesCollections, (err) => {
        if (err) {
          reject(err);
          return;
        }
        res.json({
          games: ownedGamesData.apps
        }).end();
      });
    });
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.post('/api/register/:vanityName', (req, res) => {
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
          confirmationUrl: `/api/confirm-register/${token}`
        }).end();
      });
    });
  }).catch(() => {
    res.status(500).json({ error: 'Server error' }).end();
  });
});

app.post('/api/confirm-register/:token', (req, res) => {
  const steamId = steamIdsPendingConfirmation[req.params.token];
  if (!steamId) {
    res.status(410).json({ error: 'Confirmation url expired' }).end();
    return;
  }
  saveSteamId(steamId, (err) => {
    if (err) {
      res.status(500).json({ error: 'Server error' }).end();
      return;
    }
    res.status(204).end();
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
    return new Promise((resolve, reject) => {
      clearOwnedGames((err) => {
        if (err) {
          reject(err);
          return;
        }
        deleteSteamId(steamid, (err) => {
          if (err) {
            reject(err);
            return;
          }
          res.status(204).end();
        });
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
