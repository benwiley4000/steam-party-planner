Vue.component('table-component', window['vue-tabs'].TableComponent);
Vue.component('table-column', window['vue-tabs'].TableColumn);

var app = new Vue({
  data: {
    games: []
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
  }
});

// TODO: solve bug where updated data can't be received by
// table component. This makes fetch before mount necessary.
// https://github.com/spatie/vue-table-component/issues/13
app.fetchGames().then(() => {
  document.getElementById('loading-message').classList.add('hidden');
  document.getElementById('steam-party-planner').classList.remove('hidden');
  app.$mount('#steam-party-planner');
});
