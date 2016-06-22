define(function () {

    var log = require('intel').getLogger('Utils');
    var Utils = {
	get_screens: function () {
	    return gui.Screen.screens;
	},
	get_presentation_screen: function () {
	    var screens = this.get_screens();
	    if (typeof screens[App.Settings.GeneralSettings.presentation_monitor] == "undefined") {
		return screens[0];
	    } else {
		return screens[App.Settings.GeneralSettings.presentation_monitor];
	    }
	},
	get_control_screen: function () {
	    var screens = this.get_screens();
	    return screens[0];
	},
	get_verse_background: function () {
	    var d = Q.defer();

	    switch (App.Settings.BibleSettings.background_mode) {

		case ('all_slides_has_same_back'):
		    d.resolve(App.Settings.BibleSettings.background);
		    break;
		case ('all_slides_has_random_back'):

		    this.get_random_background(App.Settings.BibleSettings.backgrounds_path)
			    .then(function (slideBackground) {
				d.resolve(slideBackground);
			    });
		    break;
	    }

	    return d.promise;
	},
	get_song_background: function () {
	    var d = Q.defer();

	    switch (App.Settings.SongserviceSettings.background_mode) {

		case ('all_slides_has_same_back'):
		    d.resolve(App.Settings.SongserviceSettings.background);
		    break;
		case ('all_slides_has_random_back'):

		    this.get_random_background(App.Settings.SongserviceSettings.backgrounds_path)
			    .then(function (slideBackground) {
				d.resolve(slideBackground);
			    });
		    break;
	    }

	    return d.promise;
	},
	get_random_background: function (path) {

//	    if (reset == true) {
//		array = [];
//	    }

//	    if (array.length == 0) {

	    /* Reload background files */

	    var d = Q.defer();
	    this.get_backgrounds(path)
		    .then(function (files) {
			var background = files[Math.floor(Math.random() * files.length)];
			d.resolve(background.path);
		    });
	    return d.promise;
//	    }

//	    var background_index = array.indexOf(background);
//	    array.splice(background_index, 1);
	},
	get_files: function (search_path, extensions_array) {
	    var d = Q.defer();
	    var files = [];
	    klaw(search_path)
		    .on('data', function (item) {
			if (item.stats.isFile() && extensions_array.indexOf(path.extname(item.path)) >= 0) {
			    files.push(item.path);
			}
		    })
		    .on('error', function (err, item) {
			log.error("%:2j on %s", new Error(err), item.path);
			throw new Error(err);
		    })
		    .on('end', function () {
			d.resolve(files);
		    });

	    return d.promise;
	},
	get_backgrounds: function (background_path) {
	    var d = Q.defer();

	    var extensions = [".png", ".jpg"];
	    var image_objects = [];

	    this.get_files(background_path, extensions)
		    .then(function (files) {
			files.forEach(function (file) {
			    var imgObj = {
				name: path.basename(file),
				path: file,
			    };
			    image_objects.push(imgObj);
			});
			d.resolve(image_objects);
		    });
	    return d.promise;
	},
	get_bibles: function (bible_path) {
	    var d = Q.defer();
	    var extensions = [".xml"];
	    var bible_objects = [];

	    this.get_files(bible_path, extensions)
		    .then(function (files) {
			files.forEach(function (file) {
			    var bibleObj = {
				name: path.basename(file),
				path: file,
			    };
			    bible_objects.push(bibleObj);
			});
			d.resolve(bible_objects);
		    });
	    return d.promise;
	}
    }

    return Utils
});