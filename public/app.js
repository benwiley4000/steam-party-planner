Vue.component('table-component', window['vue-tabs'].TableComponent);
Vue.component('table-column', window['vue-tabs'].TableColumn);

var app = new Vue({
  data: {
    games: [],
    players: [],
    loadedGame: null,
    steamName: '',
    nameError: '',
    profileConfirmation: null,
    confirmError: '',
    confirmSuccess: ''
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
        console.log()
        for (var i = 0; i < this.players.length; i++) {
          if (this.players[i].steamid === id) {
            return this.players[i].realname || this.players[i].personaname;
          }
        }
      }.bind(this)).join(', ') : '';
    },
    loadedGameHours: function () {
      return this.loadedGame ? this.loadedGame.playtime_in_hours : '';
    },
    steamNameAdded: function () {
      return (
        localStorage.steamid &&
        this.players.findIndex(function (player){
          return player.steamid.toString() === localStorage.steamid.toString();
        }) !== -1
      );
    }
  },

  methods: {
    fetchGames: function () {
      return fetch('/api/owned-games').then(function (res) {
        return res.json();
      }).then(function (data) {
        this.games = data.games.map(function (game) {
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
    submitName: function (e) {
      e.cancel();
      if (!this.steamName) {
        this.nameError = 'You must enter a name';
        return;
      }
      this.nameError = '';
      fetch('/api/players/' + this.steamName, { method: 'POST' }).then(function (res) {
        return res.json();
      }).then(function (data) {
        if (data.error) {
          this.nameError = data.error;
          return;
        }
        this.profileConfirmation = data;
        this.$refs.joinModal.hide();
        this.$refs.confirmModal.show();
      }.bind(this));
    },
    clearName: function () {
      this.steamName = '';
      this.nameError = '';
      this.confirmError = '';
    },
    confirmJoin: function (e) {
      e.cancel();
      fetch(this.profileConfirmation.confirmationUrl, { method: 'POST' }).then(function (res) {
        return res.json();
      }).then(function (data) {
        if (data.error) {
          this.confirmError = data.error;
          return;
        }
        this.confirmSuccess = 'Success!';
        localStorage.steamid = this.profileConfirmation.player.steamid.toString();
        window.location.assign('/');
      }.bind(this));
    }
  }
});

// TODO: solve bug where updated data can't be received by
// table component. This makes fetch before mount necessary.
// https://github.com/spatie/vue-table-component/issues/13
Promise.all([app.fetchGames(), app.fetchPlayers()]).then(function () {
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
