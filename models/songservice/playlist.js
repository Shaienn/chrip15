/**
 * Created by shaienn on 04.09.15.
 */

(function (App) {
    'use strict';

    App.Model.PlayList = Backbone.Model.extend({});

    var PlayListCollection = Backbone.Collection.extend({
	initialize: function () {
	    this.on("add", _.bind(this.addToPlaylist, this));
	    this.on("change", _.bind(this.changePlaylist, this));
	    this.on("remove", _.bind(this.removeFromPlaylist, this));
	},
	onDestroy: function () {
	    this.off("add");
	    this.off("change");
	    this.off("remove");
	},
	changePlaylist: function () {
	    App.Database.remove_all_songs_from_last_songs().then(function () {
		App.Model.PlayListCollection.each(function (model) {
		    App.Database.add_song_to_last_songs(model);
		});
	    });
	},
	addToPlaylist: function (song) {
	    App.SlideGenerator.make_slides_from_song(song).then(function (slides) {
		song.slides = slides;
	    });

	    App.Database.add_song_to_last_songs(song);
	},
	removeFromPlaylist: function (song) {
	    App.Database.remove_song_from_last_songs(song);
	},
    });

    App.Model.PlayListCollection = new PlayListCollection({
	model: App.Model.Song,
    })

    App.Model.PlayListCollection.reset([]);

})(window.App);
