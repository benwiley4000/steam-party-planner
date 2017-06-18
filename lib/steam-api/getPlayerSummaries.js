var fetch = require('node-fetch');

function getPlayerSummaries (steamIds) {
  return fetch(
    process.env.STEAM_API_ROOT +
    '/ISteamUser/GetPlayerSummaries/v0001/?key=' +
    process.env.STEAM_API_KEY +
    '&steamids=' +
    // TODO: support more than 100 players (the steam API limit) at a time
    steamIds.slice(0, 100).join(',')
  ).then(data => data.json()).then(data => data.response);
}

module.exports = getPlayerSummaries;
