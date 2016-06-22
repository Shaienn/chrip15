/**
 * Created by shaienn on 13.09.15.
 */

(function (App) {
    'use strict'
    var log = require('intel').getLogger('App.View.SongService.SongBaseToolbar');
    App.View.SongService.SongBaseToolbar = Backbone.Marionette.ItemView.extend({
	template: '#songbase-toptoolbar-tpl',
	id: 'songbase-toptoolbar',
	ui: {
	    searchForm: '.search form',
	    searchInput: '.search input',
	    search: '.search',
	    searchClear: '.search .clear',
	},
	events: {
	    'hover  @ui.searchInput': 'focus',
	    'submit @ui.searchForm': 'search',
	    'contextmenu @ui.searchInput': 'rightclick_search',
	    'click  @ui.searchClear': 'clearSearch',
	    'click  @ui.search': 'focusSearch',
	    'click #songservice-settings-btn': 'settingsBtnHandler',
	    'click #songservice-presentation-btn': 'presentationBtnHandler',
	},
	focus: function (e) {

	    log.info("focus request");

	    e.focus();
	},
	rightclick_search: function (e) {

	    log.info("rightclick_search request");

	    e.stopPropagation();
	    var search_menu = new this.context_Menu('Cut', 'Copy', 'Paste');
	    search_menu.popup(e.originalEvent.x, e.originalEvent.y);
	},
	focusSearch: function () {
	    log.info("focusSearch request");

	    this.$('.search input').focus();
	},
	search: function (e) {

	    log.info("search request");
	    e.preventDefault();
	    var searchvalue = this.ui.searchInput.val();
	    App.vent.trigger('songbase:search', searchvalue);
	    this.ui.searchInput.blur();
	},
	clearSearch: function (e) {

	    log.info("clearSearch request");

	    this.ui.searchInput.focus();
	    e.preventDefault();

	    this.ui.searchInput.val('');
	    this.ui.searchForm.removeClass('edited');
	},
    });



})(window.App);