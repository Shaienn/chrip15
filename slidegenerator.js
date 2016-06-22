/**
 * Created by shaienn on 05.09.15.
 */

define(function () {
    var log = require('intel').getLogger('SlideGenerator');
    var SlideGenerator = {
	make_slide_from_verse: function (verse) {
	    var d = Q.defer();

	    var slideModel = new App.Model.Bible.Slides.Slide();

	    App.Utils.get_verse_background()
		    .then(function (slideBackground) {
			/* Change newline characters for <br> tag. Needs for bigtext script */

			var sourceText = verse.get('text');

			/* Find _strings_ and make it italic */

			var preparedText = sourceText.trim();
			var screen_bounds = App.Utils.get_presentation_screen().bounds;

			slideModel.set('number', 1);
			slideModel.set("text", preparedText);
			slideModel.set("link", verse.get('bottom_text'));
			slideModel.set("background", slideBackground);
			slideModel.set("width", screen_bounds.width);
			slideModel.set("height", screen_bounds.height);
			d.resolve(slideModel);
		    });

	    return d.promise;
	},
	make_slides_from_song: function (song) {

	    log.verbose("makeSlidesFromSong");

	    if (!(song instanceof App.Model.SongService.Elements.Element)) {
		throw new Error("Object is not song");
	    }

	    var textParts = this._getPartsFromText(song.get('text'));


	    if (textParts.length == 0) {
		log.error("No textparts created");
		return;
	    }

	    var slides = [];

	    textParts.forEach(function (item, i, arr) {

		slides.push(SlideGenerator.make_slide_from_text(item, i));

	    });

	    return Q.all(slides);
	},
	make_slide_from_text: function (text, number) {
	    var d = Q.defer();
	    var slideModel = new App.Model.SongService.Slides.Slide();

	    if (number != "undefined") {
		slideModel.set('number', number);
	    }

	    App.Utils.get_song_background()
		    .then(function (slideBackground) {


			console.log(slideBackground);

			/* Change newline characters for <br> tag. Needs for bigtext script */

			var preparedText = text.trim().replace(/\r\n|\n/g, "<br>");
			var screen_bounds = App.Utils.get_presentation_screen().bounds;

			slideModel.set("text", preparedText);
			slideModel.set("background", slideBackground);
			slideModel.set("width", screen_bounds.width);
			slideModel.set("height", screen_bounds.height);
			slideModel.set("font", App.Settings.SongserviceSettings.font_family.toLowerCase());

			d.resolve(slideModel);
		    });

	    return d.promise;
	},
	_getPartsFromText: function (text) {

	    var parts = [];
	    var res;

	    while ((res = App.Settings.Config.slide_part.pattern.exec(text)) != null) {

		var raw_text = res[1].trim();
		for (var p in App.Settings.Config.song_parts_patterns) {

		    var part_pattern = App.Settings.Config.song_parts_patterns[p].pattern;
		    var part = part_pattern.exec(raw_text);

		    if (part == null) {
			continue;
		    }

		    parts.push(part[1].trim());
		    break;
		}
	    }
	    return parts;

	},
    };

    return SlideGenerator;
});
