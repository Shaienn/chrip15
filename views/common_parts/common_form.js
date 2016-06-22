(function (App) {
    'use strict';
    var self;
    var log = require('intel').getLogger('App.View.Common.Forms.SimpleForm');
    App.View.Common.Forms.SimpleForm = Backbone.Modal.extend({
	template: null,
	lock: false,
	events: {
	    'click #action-btn': 'doActionsBtnHandler',
	    'click #cancel-btn': 'cancelBtnHandler',
	},
	initialize: function (options) {
	    self = this;
	    self.init(options);
	    if (self.template == null) {
		log.error("template should be redefined in child view");
	    }
	},
	beforeCancel: function () {
	    /* It prevents close modal when we click outside */
	    return false;
	},
	doActionsBtnHandler: function () {
	    log.verbose('doActionsBtnHandler');
	    if (this.lock === false) {
		this.lock = true;
		if (self.actions()) {
		    self.cancel();
		}
	    }

	    this.lock = false;
	},
	cancelBtnHandler: function () {
	    log.verbose("cancelBtnHandler");
	    self.cancel();
	},
	cancel: function () {
	    log.verbose('cancel');
	    self.destroy();
	},
	key_map: function (event) {
	    var key = event.which;

	    /* Enter is OK */
	    /* ESC is Cancel */

	    switch (key) {
		case (13):
		    self.doActionsBtnHandler();
		    break;
		case (27):
		    self.cancel();
		    break;
	    }
	},
	onShow: function () {
	    log.verbose('onShow');
	    $(App.ControlWindow.window.document).on('keydown', self.key_map);
	    if (typeof self.show !== 'undefined') {
		self.show();
	    }
	},
	onDestroy: function () {
	    log.verbose('onDestroy');
	    $(App.ControlWindow.window.document).off('keydown', self.key_map);
	    if (typeof self.destroy_actions !== 'undefined') {
		self.destroy_actions();
	    }
	},
	/* Can be overrided on child view */

	init: function (options) {},
	show: function () {},
	destroy_actions: function () {},
	actions: function () {},
    });
})(window.App);