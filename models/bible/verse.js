'use strict';
(function (App) {
    App.Model.Verse = Backbone.Model.extend({
	defaults: {
	    text: "",
	    bottom_text: "",
	    verse: "",
	    cid: "",
	    slides: "",
	},
    });

    App.Model.VerseCollection = Backbone.Collection.extend({
	model: App.Model.Verse,
    });

})(window.App);
