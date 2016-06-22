/**
 * Created by shaienn on 04.09.15.
 */

(function (App) {
    'use strict';

    App.Model.Author = Backbone.Model.extend({
	defaults: {
	    name: "",
	    db: "0",
	    uaid: 0,
	    gaid: 0,
	    text: "",
	},
	getSongs: function () {
	    return App.Database.load_songs(this);
	}
    });

    App.Model.AuthorCollection = Backbone.Collection.extend({
	model: App.Model.Author,
	comparator: 'name'
    });


})(window.App);