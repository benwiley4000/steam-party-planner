var fetch = require('node-fetch');

function resolveVanityName (vanityName) {
  return fetch(
    process.env.STEAM_API_ROOT +
    '/ISteamUser/ResolveVanityURL/v0001/?key=' +
    process.env.STEAM_API_KEY +
    '&vanityurl=' +
    vanityName
  ).then(data => data.json()).then(data => data.response);
}

module.exports = resolveVanityName;
