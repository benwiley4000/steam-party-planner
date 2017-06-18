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

const steamIdsPath = './steamids.json';
let steamIds;
try {
  steamIds = require(steamIdsPath);
} catch (e) {
  steamIds = [];
}

function saveSteamId (id, callback) {
  if (steamIds.indexOf(id) !== -1) {
    callback(); // no-op, but no need to return an error at this stage
    return;
  }
  steamIds.push(id);
  fs.writeFile(steamIdsPath, JSON.stringify(steamIds), callback);
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

app.get('/api/registered-players', (req, res) => {
  getPlayerSummaries(steamIds).then(({ players: { player: players } }) => {
    res.json({ players }).end();
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
    saveSteamIdPendingConfirmation(player.steamid, (err, token) => {
      if (err) {
        throw err;
      }
      res.json({
        player,
        confirmationUrl: `/api/confirm-register/${token}`
      }).end();
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
    res.end();
  });
});

const port = 9876;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
