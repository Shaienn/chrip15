/**
 * Created by shaienn on 02.09.15.
 */

(function (App) {
    'use strict';
    var log = require('intel').getLogger('App.View.SongService.SongBase');
    var self;
    App.View.SongService.SongBase = Backbone.Marionette.LayoutView.extend({
	template: '#songbase-tpl',
	className: 'row',
	ui: {
	    A_Loader: '#songBaseAuthorsList .area .loader',
	    S_Loader: '#songBaseSongsList .area .loader',
	    searchInput: '.search input',
	    searchForm: '.search form',
	},
	regions: {
	    AuthorsList_r: '#songBaseAuthorsList .area .authors',
	    AuthorsListControl_r: '#songBaseAuthorsList .control',
	    SongList_r: '#songBaseSongsList .area .songs',
	    SongListControl_r: '#songBaseSongsList .control',
	    PlayList_r: '#songBasePlayList',
	    Preview_r: '#songBaseSongPreview',
	    modals: {
		selector: '#songBaseModal',
		regionClass: Backbone.Marionette.Modals
	    }
	},
	events: {
	    'click .close-icon': 'closeSongbase',
	    'click #authorslist-add-btn': 'openAddAuthorWindow',
	    'click #authorslist-remove-btn': 'openRemoveAuthorWindow',
	    'click #authorslist-edit-btn': 'openEditAuthorWindow',
	    'click #songslist-add-btn': 'openAddSongWindow',
	    'click #songslist-remove-btn': 'openRemoveSongWindow',
	    'click #songslist-edit-btn': 'openEditSongWindow',
	    'submit @ui.searchForm': 'search',
	},
	loadedAuthors: [],
	selectedAuthor: null,
	selectedSong: null,
	initialize: function () {
	    self = this;
	    this.listenTo(App.vent, "songbase:loadsongs", _.bind(this.loadSongs, this));
	    this.listenTo(App.vent, "songbase:search", _.bind(this.search, this));
	    this.listenTo(App.vent, "songbase:selectAuthor", _.bind(this.selectAuthor, this));
	    this.listenTo(App.vent, "songbase:loadtext", _.bind(this.loadText, this));
	},
	onDestroy: function () {
	    $('#songservice-control').show();
	    $('#appmode-menu').show();
	    $('#main-window-toptoolbar').show();
	    $('#header').removeClass('header-shadow');
	},
	loadText: function (song) {

	    if (!(song instanceof App.Model.SongService.Elements.Element)) {
		log.error("Wrong song object");
		return;
	    }

	    /* Assign buttons */

	    switch (song.get('db')) {
		case('1'):
		    $('#songslist-remove-btn').addClass('disabled');
		    break;
		case('2'):
		    $('#songslist-remove-btn').removeClass('disabled');
		    break;
		default:
		    $('#songslist-remove-btn').addClass('disabled');
	    }
	    $('#songslist-edit-btn').removeClass('disabled');

	    this.selectedSong = song;

	    /* Clear song text */

	    var preview_text = "";
	    var res;

	    while ((res = App.Settings.Config.slide_part.pattern.exec(song.get('text'))) != null) {

		var raw_text = res[1];

		for (var p in App.Settings.Config.song_parts_patterns) {

		    var part_pattern = App.Settings.Config.song_parts_patterns[p].pattern;
		    var part = part_pattern.exec(raw_text);

		    if (part == null) {
			continue;
		    }

		    var part_text = part[1].trim();

		    /* remove chords */

		    var pure_text = part_text.replace(App.Settings.Config.chord_pattern, "");
		    preview_text += pure_text;

		    break;
		}

		preview_text += require('os').EOL + require('os').EOL;

	    }

	    var previewModel = new App.Model.Preview({
		plaintext: preview_text
	    });

	    this.Preview_r.show(new App.View.Preview({
		model: previewModel
	    }));

	},
	search: function (e) {
	    e.preventDefault();
	    var search_string = this.ui.searchInput.val();
	    this.ui.searchInput.blur();
	    App.Database.search(search_string).then(function (loadedSongs) {

		log.info(JSON.stringify(loadedSongs));

		var songCollection = new App.Model.SongService.Elements.List(loadedSongs);

		var songCollectionView = new App.View.SongService.Songs.List({
		    collection: songCollection
		});

		self.SongList_r.show(songCollectionView);

	    });

	},
	openAddAuthorWindow: function () {

	    var form = new App.View.SongService.Authors.EditForm({
		author: new App.Model.Author(),
		songbase: this
	    });

	    this.modals.show(form);

	},
	openEditAuthorWindow: function () {

	    if ($('#authorslist-edit-btn').hasClass('disabled')) {
		return;
	    }

	    /* Get selected author */

	    if (this.selectedAuthor == null) {
		return;
	    }

	    var form = new App.View.SongService.Authors.EditForm({
		author: this.selectedAuthor,
		songbase: this
	    });

	    this.modals.show(form);

	},
	openRemoveAuthorWindow: function () {

	    if ($('#authorslist-remove-btn').hasClass('disabled')) {
		return;
	    }

	    var form = new App.View.SongService.Authors.RemoveForm({
		author: this.selectedAuthor,
		songbase: this
	    });

	    this.modals.show(form);
	},
	openAddSongWindow: function () {

	    var form = new App.View.SongService.Songs.EditForm({
		song: new App.Model.SongService.Elements.Element(),
		authors: this.loadedAuthors,
		songbase: this
	    });

	    this.modals.show(form);

	},
	openEditSongWindow: function () {

	    var form = new App.View.SongService.Songs.EditForm({
		song: this.selectedSong,
		authors: this.loadedAuthors,
		songbase: this
	    });

	    this.modals.show(form);

	},
	openRemoveSongWindow: function () {

	    if ($('#songslist-remove-btn').hasClass('passive')) {
		return;
	    }

	    var form = new App.View.SongService.Songs.RemoveForm({
		author: this.selectedAuthor,
		song: this.selectedSong,
		songbase: this
	    });

	    this.modals.show(form);
	},
	loadSongsLoader: function () {
	    this.ui.S_Loader.show();
	},
	hideSongsLoader: function () {
	    this.ui.S_Loader.hide();
	},
	loadSongs: function (author) {

	    assert.ok(author instanceof App.Model.Author);
	    console.log(author);
	    this.loadSongsLoader();

	    /* Assign buttons */

	    switch (author.get('db')) {

		case('1'):
		    $('#authorslist-remove-btn').addClass('disabled');
		    break;
		case('2'):
		    $('#authorslist-remove-btn').removeClass('disabled');
		    break;
		default:
		    $('#authorslist-remove-btn').addClass('disabled');
	    }
	    $('#authorslist-edit-btn').removeClass('disabled');

	    author.getSongs().then(function (loadedSongs) {

		log.info("%:2j", loadedSongs);

		var songCollection = new App.Model.SongService.Elements.List(loadedSongs);

		var songCollectionView = new App.View.SongService.Songs.List({
		    collection: songCollection,
		});

		self.SongList_r.show(songCollectionView);
		self.hideSongsLoader();
	    });

	},
	loadAuthorsLoader: function () {
	    this.ui.A_Loader.show();
	},
	hideAuthorsLoader: function () {
	    this.ui.A_Loader.hide();
	},
	selectAuthor: function (author) {

	    assert.ok(author instanceof App.Model.Author);
	    var uaid = author.get('uaid');
	    var gaid = author.get('gaid');

	    if (typeof uaid == "undefined" || typeof gaid == "undefined") {
		return;
	    }

	    /* Save selected author */

	    this.selectedAuthor = author;

	    var authors_list = $('.author-element-list');
	    authors_list.children('li.active').removeClass('active');
	    var item = authors_list.find('.item-container[uaid=' + uaid + '][gaid=' + gaid + ']');
	    item.parent('.author-element-item').addClass('active');
	    authors_list.scrollTop(0).scrollTop(item.position().top);
	    this.loadSongs(author);
	},
	loadAuthors: function () {

	    this.loadAuthorsLoader();
	    var self = this;

	    App.Database.load_singers().then(function (loaded_singers) {
		var authorCollection = new App.Model.AuthorCollection(loaded_singers);
		var authorCollectionView = new App.View.SongService.Authors.List({
		    collection: authorCollection,
		});

		self.loadedAuthors = authorCollection;
		self.AuthorsList_r.show(authorCollectionView);
		self.hideAuthorsLoader();
	    });
	},
	onShow: function () {
	    log.verbose("onShow");

	    this.loadAuthors();
	    $('#header').addClass('header-shadow');
	    $('#songservice-control').hide();
	    $('#appmode-menu').hide();
	    $('#main-window-toptoolbar').hide();
	    $('#songslist-edit-btn').addClass('disabled');
	    $('#songslist-remove-btn').addClass('disabled');
	    $('#authorslist-edit-btn').addClass('disabled');
	    $('#authorslist-remove-btn').addClass('disabled');

	    this.PlayList_r.show(new App.View.SongService.PlayList.List({
		childView: App.View.PlayListSongBase,
		collection: App.Model.PlayListCollection,
	    }));

	},
	closeSongbase: function () {
	    App.vent.trigger('songservice:close_songbase');
	},
    });



}(window.App));
