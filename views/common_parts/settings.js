/**
 * Created by shaienn on 02.09.15.
 */
'use strict';

(function (App) {
    var log = require('intel').getLogger('Settings');
    App.View.Settings.Root = Backbone.Marionette.ItemView.extend({
	template: '#settings-tpl',
	id: 'settings-main-window',
	background_loaded: false,
	ui: {
	    fakeBackgroundsDir: '#fakebackgroundsdir',
	    backgrounds_path: '#backgrounds_path',
	    sections: 'section',
	},
	events: {
	    'change select,input': 'saveSetting',
	    'click #change_background_dir': 'showBackgroundsDirectoryDialog',
	},
	showBackgroundsDirectoryDialog: function () {
	    this.ui.backgrounds_path.click();
	},
	initialize: function () {
	    this.listenTo(App.vent, "settings:control:onEvent", _.bind(this.onEvent, this));
	    this.listenTo(App.vent, "settings:control:offEvent", _.bind(this.offEvent, this));
	    this.listenTo(App.vent, "resize", _.bind(this.redrawPreview, this));
	},
	onShow: function () {
	    log.verbose("App.View.Settings.Root");
	    this.render();
	    this.refreshBackgroundFiles();
	    this.refreshBibleFiles();
	},
	onEvent: function () {
	    this.redrawPreview();
	},
	offEvent: function () {

	},
	redrawPreview: function (target) {
	    log.verbose("redrawPreview");
	    var that = this;
	    if (typeof target == "undefined") {
		var target = this.ui.sections;
	    }

	    target.each(function () {
		var id = $(this).attr('id');

		switch (id) {
		    case 'SongserviceSettings':

			App.SlideGenerator
				.make_slide_from_text("Строка\r\nДлинная строка\r\nСтрока\r\nОчень очень длинная строка")
				.then(that.drawSlide);

			break;
		    case 'BibleSettings':

			var verse = new App.Model.Verse();
			verse.set("text", "И ходил этот человек из города своего в положенные дни поклоняться и приносить жертву Господу Саваофу в Силом; там были Илий и два сына его, Офни и Финеес, священниками Господа.");
			verse.set("bottom_text", "Подпись к стиху");

			App.SlideGenerator
				.make_slide_from_verse(verse)
				.then(that.drawVerse);

			break;
		}

	    });
	},
	drawVerse: function (slide) {
	    log.verbose("drawVerse");
	    var target = $('#BibleSettings > .content > .preview-container');
	    var chapter_template = _.template($('#chapter-slide-tpl').html());
	    target.html(chapter_template(slide.attributes));
	    var chapter_text = target.find('.slide-chapter-text');
	    var chapter_link = target.find('.slide-chapter-link');
	    var background = target.find('img.slide_image');

	    chapter_text.hide();
	    chapter_link.hide();
	    background.load(function () {
		chapter_link.textFit({
		    multiline: false,
		});

		chapter_text.textFit({
		    multiline: true,
		});
	    });


	},
	drawSlide: function (slide) {
	    log.verbose("drawSlide");
	    var target = $('#SongserviceSettings > .content > .preview-container');
	    var slide_template = _.template($('#slide-tpl').html());
	    target.html(slide_template(slide.attributes));
	    var text_span = target.find('.slide_text span');
	    var background = target.find('img.slide_image');

	    text_span.hide();
	    background.load(function () {
		text_span.show();
		text_span.bigText();
	    });

	},
	onDestroy: function () {
	    log.verbose("onDestroy");
	},
	refreshBibleFiles: function () {
	    log.verbose("refreshBibleFiles");
	    App.Utils.get_bibles(App.Settings.BibleSettings.bible_path)
		    .then(function (bible_objects) {
			var html = "";
			for (var i = 0; i < bible_objects.length; i++) {
			    html += "<option " + (App.Settings.BibleSettings.bible_xml == bible_objects[i].path ? "selected='selected'" : "")
				    + " value='" + bible_objects[i].path + "'>" + bible_objects[i].name + "</option>";
			}
			$("#bibleSelector").html(html);
		    });
	},
	refreshBackgroundFiles: function () {

	    /* Songservice */

	    App.Utils.get_backgrounds(App.Settings.SongserviceSettings.backgrounds_path)
		    .then(function (image_objects) {
			var html = "";
			for (var i = 0; i < image_objects.length; i++) {
			    html += "<option " + (App.Settings.SongserviceSettings.background == image_objects[i].path ? "selected='selected'" : "")
				    + " value='" + image_objects[i].path + "'>" + image_objects[i].name + "</option>";
			}
			$("#SongserviceSettings .background-image-selector").html(html);
		    });

	    /* Bible */

	    App.Utils.get_backgrounds(App.Settings.BibleSettings.backgrounds_path)
		    .then(function (image_objects) {
			var html = "";
			for (var i = 0; i < image_objects.length; i++) {
			    html += "<option " + (App.Settings.BibleSettings.background == image_objects[i].path ? "selected='selected'" : "")
				    + " value='" + image_objects[i].path + "'>" + image_objects[i].name + "</option>";
			}
			$("#BibleSettings .background-image-selector").html(images_select);
		    });
	},
	saveSetting: function (e) {

	    var value = false;
	    var field = $(e.currentTarget);
	    var background_path_changed = false;
	    var bible_changed = false;
	    var valid = false;
	    var section = field.closest("section");

	    switch (field.attr('name')) {

		case ('presentation_monitor'):

		    value = $('option:selected', field).val();
		    valid = true;

		    break;

		case ('font_family'):

		    value = $('option:selected', field).val();
		    valid = true;

		    break;

		case ('backgrounds_path'):

		    value = field.val();
		    $('#fakebackgroundsdir').attr('value', value);
		    background_path_changed = true;
		    valid = true;

		    break;

		case ('background_mode'):

		    value = $('option:selected', field).val();
		    valid = true;

		    break;

		case ('background'):

		    value = $('option:selected', field).val();
		    valid = true;

		    break;

		case ('bible_xml'):

		    value = $('option:selected', field).val();
		    bible_changed = true;
		    valid = true;

		    break;
		case ('show_time'):
		    value = field.val();

		    if (!isInteger(value)) {
			value = App.Settings.BlockScreensSettings.show_time;
			valid = false;
			break;
		    }

		    if (value < 1) {
			value = 1;
		    }

		    valid = true;
		    break;
	    }


	    if (valid == true) {
		win.info(section.attr('id') + ' changed: ' + field.attr('name') + ' - ' + value);
		App.Settings[section.attr('id')][field.attr('name')] = value;
		App.Database.saveSetting(section.attr('id'), field.attr('name'), value);


		if (background_path_changed == true) {
		    this.refreshBackgroundFiles();
		}

		if (bible_changed == true) {
		    App.vent.trigger("bible:control:changeBibleXml", App.Settings.BibleSettings.bible_xml);
		}

		/* Redraw slide */

		this.redrawPreview(section);

	    }
	},
    });


}(window.App));
