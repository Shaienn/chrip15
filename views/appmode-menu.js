/**
 * Created by shaienn on 13.09.15.
 */

(function (App) {
    'use strict'
    var log = require('intel').getLogger('App.View.AppModeMenu');
    App.View.AppModeMenu = Backbone.Marionette.ItemView.extend({
	template: '#appmode-menu-tpl',
	id: 'appmode-menu-container',
	className: 'col-lg-12',
	events: {
	    'click #appmode-menu-songservice-btn': 'songsBtnHandler',
	    'click #appmode-menu-bible-btn': 'bibleBtnHandler',
	    'click #appmode-menu-media-btn': 'mediaBtnHandler',
	    'click #appmode-menu-slides-btn': 'slidesBtnHandler',
	    'click #appmode-menu-settings-btn': 'settingsBtnHandler',
	},
	songsBtnHandler: function () {
	    log.verbose("presentation button click");
	    App.vent.trigger("appmode:switch_tab_to", "songservice");
	},
	bibleBtnHandler: function () {
	    log.verbose(" bible button click");
	    App.vent.trigger("appmode:switch_tab_to", "bible");
	},
	mediaBtnHandler: function () {
	    log.verbose("media button click");
	    App.vent.trigger("appmode:switch_tab_to", "media");
	},
	slidesBtnHandler: function () {
	    log.verbose("slides button click");
	    App.vent.trigger("appmode:switch_tab_to", "blockscreens");
	},
	settingsBtnHandler: function () {
	    log.verbose("Settings button click");
	    App.vent.trigger("appmode:switch_tab_to", "settings");
	}

    });
})(window.App);
