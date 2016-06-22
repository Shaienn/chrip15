(function (App) {
    'use strict';

    App.View.Preview = Marionette.ItemView.extend({
	tagName: 'div',
	className: 'preview',
	template: _.template("<%= html %>"),
	initialize: function () {
	    this.model.on('change:html', this.render, this);
	},
    });
})(window.App);


