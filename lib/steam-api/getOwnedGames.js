var fetch = require('node-fetch');

function getOwnedGames (steamId) {
  return fetch(
    process.env.STEAM_API_ROOT +
    '/IPlayerService/GetOwnedGames/v0001/?key=' +
    process.env.STEAM_API_KEY +
    '&steamid=' +
    steamId +
    '&include_played_free_games=1&include_appinfo=1'
  ).then(data => data.json()).then(data => data.response);
}

module.exports = getOwnedGames;
