/**
 * Created by shaienn on 03.09.15.
 */


(function (App) {

    'use strict'

    App.View.SongService.BottomToolBar = Backbone.Marionette.ItemView.extend({
	template: '#songservice-playlist-bottomtoolbar-tpl',
	events: {
	    'click #songservice-openbase-btn': 'openSongBase'
	},
	openSongBase: function () {
	    App.vent.trigger("songservice:show_songbase");
	},
    });

})(window.App);
