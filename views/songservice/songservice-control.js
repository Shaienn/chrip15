/**
 * Created by shaienn on 02.09.15.
 */

/* It is a type of work mode when we make a presentation and show it on decided screen */


(function (App) {
    'use strict';
    var log = require('intel').getLogger('App.View.SongService.Control');
    var self;
    App.View.SongService.Control = Backbone.Marionette.LayoutView.extend({
	template: '#songservice-control-tpl',
	id: 'songservice-control-contain',
	collection: null,
	active_item: null,
	regions: {
	    BottomToolbar_r: '#playlist_bottomtoolbar',
	    List_r: '#playlist_list',
	    ControlPanel_r: "#controlPanel",
	    modals: {
		selector: '#songServiceModal',
		regionClass: Backbone.Marionette.Modals
	    }
	},
	/******************* Layout functions *******************/

	initialize: function () {
	    self = this;
	    this.listenTo(App.vent, 'songservice:playlist:item_selected', _.bind(self.show_song_slides, self));
	    this.listenTo(App.vent, 'songservice:control:onEvent', _.bind(this.onEvent, this));
	    this.listenTo(App.vent, 'songservice:control:offEvent', _.bind(this.offEvent, this));
	    this.listenTo(App.vent, 'songservice:control:showslide', _.bind(this.showSlide, this));

	    /* Context menu */

	    this.listenTo(App.vent, "songservice:control:context:song_slides_redraw", _.bind(this.song_slides_redraw, this));
	    this.listenTo(App.vent, "songservice:control:context:edit_song", _.bind(this.openEditSongWindow, this));
	},
	onShow: function () {
	    log.verbose("onShow");
	    this.BottomToolbar_r.show(new App.View.SongService.BottomToolBar);

	    /* Add last songs */


	    App.Database.get_last_songs().then(function (lastSongs) {

		log.verbose("lastSongs: %:2j", lastSongs);

		for (var i = 0; i < lastSongs.length; i++) {
		    lastSongs[i].rebuild_slides();
		    App.Model.PlayListCollection.add(lastSongs[i], {silent: true});
		}
		self.collection = new App.View.SongService.PlayList.List({
		    childView: App.View.PlayListControl,
		    collection: App.Model.PlayListCollection,
		});

		self.List_r.show(self.collection);
		_.bind(self.onEvent, self)();
	    });
	},
	/**************************************/
	openEditSongWindow: function (song) {
	    log.verbose('openEditSongWindow');

	    /* get related info */

	    App.Database.load_singers().then(function (loaded_singers) {

		var authorCollection = new App.Model.AuthorCollection(loaded_singers);
		var form = new App.View.SongService.Songs.EditForm({
		    song: song,
		    authors: authorCollection,
		    control: self
		});

		/* Turn off keydown events while in modal */

		self.modals.show(form);
	    });
	},
	showSlide: function (slide) {
	    log.verbose("showSlide");
	    var slides_panel = this.ControlPanel_r.$el;

	    if (slides_panel.length !== 0) {
		slides_panel.find('.active').removeClass('active');
		slides_panel.find('div[number=' + slide.get('number') + ']')
			.parent().addClass("active");
	    }

	    if (App.active_mode == true) {
		App.vent.trigger("presentation:set_new_element", slide);
	    }

	},
	song_slides_redraw: function (song) {
	    log.verbose("song_slides_redraw");
	    /* Redraw control regiong only if we redraw active song */

	    if (this.active_item.cid != song.cid)
		return;

	    this.show_song_slides(song);

	},
	show_song_slides: function (song) {

	    assert.ok(song instanceof App.Model.SongService.Elements.Element);
	    this.active_item = song;

	    /* Collection of itemviews */
	    var itemCollection =
		    new App.Model.SongService.Slides.List(song.slides);

	    var itemCollectionView = new App.View.SongService.Slides.List({
		collection: itemCollection,
	    });

	    this.keyAssign(song.slides.length);
	    this.ControlPanel_r.show(itemCollectionView);

	},
	onEvent: function () {
	    this.offEvent();
	    $(App.ControlWindow.window.document).on('keydown', this.keyHandler);

	    if (typeof this.List_r.currentView == "undefined") {
		self.List_r.show(new App.View.SongService.PlayList.List({
		    childView: App.View.PlayListControl,
		    collection: App.Model.PlayListCollection
		}));
	    } else {
		this.List_r.currentView.render();
	    }

	    App.vent.trigger("resize");
	},
	offEvent: function () {
	    $(App.ControlWindow.window.document).off('keydown', this.keyHandler);
	},
	keyHandler: function (event) {

//	    event.preventDefault();
	    var key = event.which;

	    if (event.ctrlKey) {

		/* CTRL + O opens songbase */

		if (key == 79) {
		    log.info("Open songbase request");
		    App.vent.trigger("songservice:show_songbase");
		}
	    }

	    if ((key >= 97) && (key <= 105)) {

		this.keys.forEach(function (item) {

		    if (item.key == key) {

			var controlPanel = $('#controlPanel ul');
			controlPanel.find('.song-element-slide-preview-item').removeClass('active');
			var item = controlPanel.find('.slide-container[number=' + item.c + ']');
			item.trigger('click');
			item.parents('.song-element-slide-preview-item').addClass('active');
			return;

		    }
		});
	    }


	    if ((key >= 37) && (key <= 40)) {

		switch (key) {

		    case (37):

			/* Select previous slide */

			var controlPanel = $('#controlPanel ul');
			var currentSlide = controlPanel.find('li.active');
			var prevSlide = currentSlide.prev('#controlPanel ul li');
			if (prevSlide.length > 0) {

			    currentSlide.removeClass('active');
			    prevSlide.find('.slide-container').trigger('click');
			    prevSlide.addClass('active');

			}
			break;

		    case (39):

			/* Select next slide */

			var controlPanel = $('#controlPanel ul');
			var currentSlide = controlPanel.find('li.active');
			var nextSlide = currentSlide.next('#controlPanel ul li');
			if (nextSlide.length > 0) {

			    currentSlide.removeClass('active');
			    nextSlide.find('.slide-container').trigger('click');
			    nextSlide.addClass('active');

			}
			break;

		    case (38):

			/* Select previous song */

			var playlist_list = $('#playlist_list ul');
			var currentSong = playlist_list.find('li.active');
			var prevSong = currentSong.prev('#playlist_list ul li');
			if (prevSong.length > 0) {

			    currentSong.removeClass('active');
			    prevSong.find('.item-container').trigger('click');
			    prevSong.addClass('active');

			}
			break;

		    case (40):

			/* Select next song */

			var playlist_list = $('#playlist_list ul');
			var currentSong = playlist_list.find('li.active');
			var nextSong = currentSong.next('#playlist_list ul li');
			if (nextSong.length > 0) {

			    currentSong.removeClass('active');
			    nextSong.find('.item-container').trigger('click');
			    nextSong.addClass('active');

			}
			break;

		}
	    }
	},
	keyAssign: function (slides_count) {

	    this.keys = [];

	    if (slides_count > 0) {

		/* 7 or Home is it */

		this.keys.push({key: 103, c: 0});

		if (slides_count > 1) {

		    /* 8 or Up is it */

		    this.keys.push({key: 104, c: 1});

		    if (slides_count > 2) {

			if (slides_count > 4) {

			    /* 9 or PgUp is it */

			    this.keys.push({key: 105, c: 2});

			} else {

			    /* 4 or Left is it */

			    this.keys.push({key: 100, c: 2});

			}

			if (slides_count > 3) {

			    if (slides_count > 4) {

				/* 4 or Left is it */

				this.keys.push({key: 100, c: 3});

			    } else {

				/* 5 or Left is it */

				this.keys.push({key: 101, c: 3});

			    }

			    if (slides_count > 4) {

				/* 5 or Left is it */

				this.keys.push({key: 101, c: 4});

				if (slides_count > 5) {

				    /* 6 or Right is it */

				    this.keys.push({key: 102, c: 5});


				    if (slides_count > 6) {

					/* 1 or End is it */

					this.keys.push({key: 97, c: 6});

					if (slides_count > 7) {

					    /* 2 or Down is it */

					    this.keys.push({key: 98, c: 7});

					    if (slides_count > 8) {

						/* 3 or PgDn is it */

						this.keys.push({key: 99, c: 8});

					    }
					}
				    }
				}
			    }
			}
		    }
		}
	    }
	},
    });

})(window.App);
