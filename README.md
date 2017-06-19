# steam-party-planner

A web app for tracking a pool of Steam user accounts and compiling data about games held in common between them. Built on top of the Steam Web API.

Built using [Express](https://expressjs.com) and [Redux](http://redux.js.org) on the back end, and [Vue.js](https://vuejs.org/) with [vue-table-component](https://github.com/spatie/vue-table-component) for the client.

Styled with the help of [Bootstrap 4](https://v4-alpha.getbootstrap.com/) and [bootstrap-vue](https://bootstrap-vue.github.io).

Pull requests welcome! Please open an issue on GitHub first (for documentation purposes, at least).

## Running the app

Requires Node.js and npm.

```bash
git clone https://github.com/benwiley4000/steam-party-planner.git
```

You'll need to copy the `.env.example` file to a new file called `.env` and change the `STEAM_API_KEY` variable to a free Steam Web API key [which you can find here](https://steamcommunity.com/dev/apikey).

Then:
```bash
npm install
npm start
# open a browser at localhost:9876
```

## API

### GET `/api/players`

Returns a list of player summary data for the Steam users the site is tracking.

### GET `/api/players/:steamId`

Returns summary data for the player matching the given `steamId`.

### GET `/api/owned-games`

Returns data for each game owned by one or more tracked players, including a list of steamIds corresponding to users who own each game.

### POST `/api/players/:vanityName`

Looks up a player by community display name (not necessarily the same as login) and stages them for tracking.

Returns summary data for the player as well as a confirmation url.

### POST `/api/confirm-player/:token`

Confirms player registration with a unique token which expires after `process.env.STEAM_ID_CONFIRMATION_TIMEOUT` milliseconds.

Shouldn't be composed manually, since this gets returned by `/api/register/:vanityName`.

### DELETE `/api/players/:vanityName`

Deletes a player from tracking. Only enabled if `process.env.ENABLE_PLAYER_DELETE` is "true".
