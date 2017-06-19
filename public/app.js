Vue.component('table-component', window['vue-tabs'].TableComponent);
Vue.component('table-column', window['vue-tabs'].TableColumn);

var app = new Vue({
  data: {
    games: [],
    players: [],
    loadedGame: null
  },

  computed: {
    gameTitle: function () {
      return this.loadedGame ? this.loadedGame.name : '';
    },
    gameLogo: function () {
      return this.loadedGame ? (
        'http://media.steampowered.com/steamcommunity/public/images/apps/' +
        this.loadedGame.appid +
        '/' +
        this.loadedGame.img_logo_url +
        '.jpg'
      ) : '';
    },
    loadedGamePlayers: function () {
      return this.loadedGame ? this.loadedGame.steam_ids.map(function (id) {
        for (var i = 0; i < this.players.length; i++) {
          if (this.players[i].steamid === id) {
            return this.players[i].realname;
          }
        }
      }).join(', ') : '';
    },
    loadedGameHours: function () {
      return this.loadedGame ? this.loadedGame.playtime_in_hours : '';
    }
  },

  methods: {
    fetchGames: function () {
      return fetch('/api/owned-games').then(function (res) {
        return res.json();
      }).then(function (data) {
        this.games = data.games.map(game => {
          game.steam_id_count = game.steam_ids.length;
          game.playtime_in_hours = (game.playtime_forever / 60).toFixed(1);
          return game;
        });
      }.bind(this));
    },
    fetchPlayers: function () {
      return fetch('/api/players').then(function (res) {
        return res.json();
      }).then(function (data) {
        this.players = data.players;
      }.bind(this));
    },
    handlePlayersModal: function (e) {
      e.preventDefault();
      this.$refs.playersModal.show();
    },
  }
});

// TODO: solve bug where updated data can't be received by
// table component. This makes fetch before mount necessary.
// https://github.com/spatie/vue-table-component/issues/13
Promise.all([app.fetchGames(), app.fetchPlayers()]).then(() => {
  document.getElementById('loading-message').classList.add('hidden');
  document.getElementById('steam-party-planner').classList.remove('hidden');
  app.$mount('#steam-party-planner');
});

// jquery style event delegation
// http://bdadam.com/blog/plain-javascript-event-delegation.html
function on(elSelector, eventName, selector, fn) {
  var element = document.querySelector(elSelector);

  element.addEventListener(eventName, function(event) {
    var possibleTargets = element.querySelectorAll(selector);
    var target = event.target;

    for (var i = 0, l = possibleTargets.length; i < l; i++) {
      var el = target;
      var p = possibleTargets[i];

      while (el && el !== element) {
        if (el === p) {
            return fn.call(p, event);
        }

        el = el.parentNode;
      }
    }
  });
}

on('body', 'click', 'tbody tr', function () {
  // hack solution since we can't attach listeners to table rows
  // https://github.com/spatie/vue-table-component/issues/15
  var gameTitle = this.querySelector('td:first-child').innerText.trim();
  for (var i = 0; i < app.games.length; i++) {
    if (app.games[i].name === gameTitle) {
      app.loadedGame = app.games[i];
      app.$refs.gameModal.show();
      break;
    }
  }
});
