'use strict';
(function (App) {
    var self;
    var log = require('intel').getLogger('App.View.Media.Control');
    App.View.Media.Control = Marionette.ItemView.extend({
	template: "#media-control-tpl",
	className: "media-control",
	ui: {
	    wrapper: '.wcp-wrapper',
	    center: '.wcp-center',
	    canvas: '#media-control-canvas',
	    time_current: '.wcp-time-current',
	    time_total: '.wcp-time-total',
	    progress_seen: ".wcp-progress-seen",
	    progress_bar: ".wcp-progress-bar",
	    tooltip: ".wcp-tooltip",
	    tooltip_inner: ".wcp-tooltip-inner",
	    vol_bar: ".wcp-vol-bar",
	    vol_bar_full: ".wcp-vol-bar-full",
	    vol_bar_pointer: ".wcp-vol-bar-pointer",
	    vol_control: ".wcp-vol-control",
	    vol_button: ".wcp-vol-button",
	    play_button: ".wcp-play",
	},
	initialize: function (options) {
	    self = this;
	    if (options.media_element != "undefined") {
		this.media_element = options.media_element;
	    }
	},
	onShow: function () {
	    var renderer = require("wcjs-renderer");
	    var vlc = require("WebChimera.js").createPlayer(["-vvv"]);
	    renderer.bind(this.ui.canvas[0], vlc);
	    vlc.play(this.media_element.get('mrl'));
	}


//	firstTime: true,
//	seekDrag: false,
//	volDrag: false,
//	main_context: null,
//	vlc_not_installed: false,
//	no_gl_context: false,
//	contexts: [],
//	vlc: null,
//	ui: {
//	    wrapper: '.wcp-wrapper',
//	    center: '.wcp-center',
//	    canvas: '#media-control-canvas',
//	    time_current: '.wcp-time-current',
//	    time_total: '.wcp-time-total',
//	    progress_seen: ".wcp-progress-seen",
//	    progress_bar: ".wcp-progress-bar",
//	    tooltip: ".wcp-tooltip",
//	    tooltip_inner: ".wcp-tooltip-inner",
//	    vol_bar: ".wcp-vol-bar",
//	    vol_bar_full: ".wcp-vol-bar-full",
//	    vol_bar_pointer: ".wcp-vol-bar-pointer",
//	    vol_control: ".wcp-vol-control",
//	    vol_button: ".wcp-vol-button",
//	    play_button: ".wcp-play",
//	},
//	events: {
//	    'click .wcp-button': 'generalBtnHandler',
//	},
//	generalBtnHandler: function (e) {
//	    var button = $(e.currentTarget);
//
//	    if (button.hasClass("wcp-pause")) {
//		self.mediaPause();
//		return;
//	    }
//
//	    if (button.hasClass("wcp-play")) {
//		self.mediaPlay();
//		return;
//	    }
//	},
//	mediaPlay: function () {
//	    var button = $(".wcp-button.wcp-play");
//	    if (button.length > 0) {
//
//		if (this.vlc.playing == false) {
//
//		    log.info("mediaPlay");
//
//		    if (this.contexts.length == 0 && App.active_mode == true) {
//			App.vent.trigger("presentation:set_new_element", this.media_element);
//		    }
//
//		    /* Stopped */
//
//		    if (this.vlc.state == 5 || this.vlc.state == 0) {
//			log.info("stopped");
//			this.vlc.play(this.media_element.get('mrl'));
//		    }
//
//		    /* Paused */
//
//		    else if (this.vlc.state == 4) {
//			log.info("paused");
//			this.vlc.play();
//		    }
//
//		    button.removeClass("wcp-play").addClass("wcp-pause");
//		}
//	    }
//	},
//	mediaPause: function () {
//	    var button = $(".wcp-button.wcp-pause");
//	    if (button.length > 0) {
//		if (this.vlc.playing) {
//		    log.info("mediaPause");
//		    button.removeClass("wcp-pause").addClass("wcp-play");
//		    this.vlc.pause();
//		}
//	    }
//	},
//	mediaStop: function () {
//	    var button = $(".wcp-button.wcp-pause");
//	    if (button.length > 0) {
//		if (this.vlc.playing) {
//		    log.info("mediaStop");
//		    button.removeClass("wcp-pause").addClass("wcp-play");
//		    this.vlc.stop();
//		    this.contexts = [];
//		}
//	    }
//	},
//	initialize: function (options) {
//	    self = this;
//	    if (options.media_element != "undefined") {
//		this.media_element = options.media_element;
//	    }
//
//	    try {
//		this.vlc_not_installed = false;
//		this.listenTo(App.vent, "mediaplayer:pause", _.bind(this.mediaPause, this));
//		this.listenTo(App.vent, "mediaplayer:play", _.bind(this.mediaPlay, this));
//		this.listenTo(App.vent, "mediaplayer:stop", _.bind(this.mediaStop, this));
//
//		this.listenTo(App.vent, "mediaplayer:add_video_context", _.bind(this.addVideoContext, this));
//		this.listenTo(App.vent, "resize", _.bind(this.onResize, this));
//		this.listenTo(App.vent, "active_mode_changed", _.bind(this.onResize, this));
//
//		this.vlc = require("WebChimera.js").createPlayer();
//		console.log(this.vlc);
//		this.vlc.onFrameSetup =
//			function (width, height, pixelFormat) {
//
//			    console.log("%d %d %s", width, height, pixelFormat);
//			    var gl = self.main_context.canvas.gl;
//			    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
//
//			    for (var i = 0; i < self.contexts.length; i++) {
//				gl = self.contexts[i].canvas.gl;
//				gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
//			    }
//			};
//		this.vlc.onFrameReady =
//			function (videoFrame) {
//			    console.log(videoFrame);
//			    self.main_context.render(videoFrame, videoFrame.width, videoFrame.height);
//			    for (var i = 0; i < self.contexts.length; i++) {
//				self.contexts[i].render(videoFrame, videoFrame.width, videoFrame.height);
//			    }
//			};
////
////		this.vlc.onFrameReady = function (frame) {
////		    console.log("ofr");
////		    if (self.no_gl_context) {
////			console.log("We can`t configure GL context. Sorry");
////		    } else {
////			self.main_context.render(frame, frame.width, frame.height);
////			for (var i = 0; i < self.contexts.length; i++) {
////			    self.contexts[i].render(frame, frame.width, frame.height);
////			}
////		    }
////		}
//	    } catch (e) {
//		console.log(e);
//		this.vlc_not_installed = true;
//	    }
//	},
//	onShow: function () {
//	    log.verbose("onShow");
//	    this.main_context = require("wcjs-renderer").bind(this.ui.canvas[0], this.vlc);
//	    console.log(this.main_context);
//
////
////	    if (this.vlc_not_installed) {
////		this.ui.center.html('VLC player is not installed. Please install for media funcionality.');
////	    } else {
////		this.main_context = require("wcjs-renderer").bind(this.ui.canvas[0], this.vlc, {});
////		if (typeof this.main_context == "undefined") {
////		    log.error("We can`t configure GL context. Sorry");
////		    this.no_gl_context = true;
////		    return;
////		}
////		this.playerInterfaceInit();
////		this.vlc.onTimeChanged = this.onTimeChanged;
////		this.vlc.onPositionChanged = this.onPositionChanged;
////		this.vlc.onPlaying = this.onPlaying;
////		this.vlc.onPaused = this.onPaused;
////		this.vlc.onStopped = this.onStopped;
////	    }
//
//
//	},
//	onDestroy: function () {
//	    if (this.vlc_not_installed) {
//
//	    } else {
//		this.vlc.stop();
//	    }
//	},
//	onActiveModeChanged: function (new_state) {
//
//	    /* If active mode changed while player was stopped */
//
//	    if (new_state === false && this.vlc.playing === false) {
//
//		/* Remove additional context */
//
//		self.contexts = [];
//
//	    }
//	},
//	onPaused: function () {
//	    if (App.active_mode === false) {
//		self.contexts = [];
//	    }
//	},
//	onStopped: function () {
//	    if (App.active_mode === false) {
//		self.contexts = [];
//	    }
//	},
//	onResize: function () {
//
//	    /* Get video aspect ratio from canvas.
//	     Renderer already set canvas to video dimension */
//
//	    var sourceAspect = this.ui.canvas.width() / this.ui.canvas.height();
//	    var destAspect = this.ui.wrapper.width() / this.ui.wrapper.height();
//	    var canvasParent = this.ui.canvas.parent();
//
//	    if (destAspect > sourceAspect) {
//
//		canvasParent.css("height", "100%");
//		canvasParent.css("width", ((this.ui.wrapper.height() * sourceAspect) / this.ui.wrapper.width()) * 100 + "%");
//
//	    } else {
//
//		canvasParent.css("width", "100%");
//		canvasParent.css("height", ((this.ui.wrapper.width() * sourceAspect) / this.ui.wrapper.height()) * 100 + "%");
//	    }
//
//	    this.ui.canvas.css("width", "100%");
//	},
//	addVideoContext: function (context_canvas) {
//
//	    log.verbose("addVideoContext");
//	    var new_context = require("wcjs-renderer").bind(context_canvas, this.vlc, {});
//	    console.log(new_context);
//	    this.contexts.push(new_context);
//
//	    /*
//	     
//	     var new_context = require("webgl-video-renderer").setupCanvas(context_canvas);
//	     if (typeof new_context !== "undefined") {
//	     this.contexts.push(new_context);
//	     } else {
//	     console.log("We can`t configure GL context. Sorry");
//	     this.no_gl_context = true;
//	     }
//	     */
//	},
//	playerInterfaceInit: function () {
//
//	    /* General click and move over player surface  */
//
//	    this.ui.wrapper.mouseup(this.mouseClickEnd);
//
//	    this.ui.wrapper.mousemove(this.mouseMoved);
//
//	    /* Bars */
//
//	    this.ui.progress_bar.hover(
//		    this.selectNewProgressPosition,
//		    this.hideNewProgressPosition
//		    );
//
//	    this.ui.progress_bar.mousemove(
//		    this.selectNewProgressPosition
//		    );
//
//	    this.ui.progress_bar.mousedown(
//		    function (e) {
//			self.seekDrag = true;
//			var rect = self.ui.wrapper[0].getBoundingClientRect();
//			var p = (e.pageX - rect.left) / self.ui.progress_bar.width();
//			self.ui.progress_seen.css("width", (p * 100) + "%");
//		    }
//	    );
//
//	    this.ui.vol_control.mouseout(
//		    function () {
//			if (
//				!(self.ui.vol_control.is(":hover")) &&
//				!(self.ui.vol_bar.is(":hover")) &&
//				!(self.ui.vol_button.is(":hover")) &&
//				!self.volDrag) {
//
//			    self.ui.vol_control.animate({width: 0}, 200);
//			}
//		    }
//	    );
//
//	    this.ui.vol_button.hover(
//		    function () {
//			self.ui.vol_control.animate({width: 133}, 200);
//		    },
//		    function () {
//			setTimeout(
//				function () {
//				    if (!(self.ui.vol_control.is(":hover")) && !self.volDrag) {
//					self.ui.vol_control.animate({width: 0}, 200);
//				    }
//				}, 500);
//		    });
//
//	    this.ui.vol_bar.mousedown(
//		    function (e) {
//			self.volDrag = true;
//			var rect = self.ui.vol_bar[0].getBoundingClientRect();
//			var p = (e.pageX - rect.left) / self.ui.vol_bar.width();
//			self.changeVolume(Math.floor(p * 200) + 5);
//		    }
//	    );
//
//
//	},
//	/************************* Helpers ***************************/
//
//	parseTime: function (t, total) {
//
//	    if (typeof total === 'undefined')
//		total = t;
//	    var tempHour = ("0" + Math.floor(t / 3600000)).slice(-2);
//	    var tempMinute = ("0" + (Math.floor(t / 60000) % 60)).slice(-2);
//	    var tempSecond = ("0" + (Math.floor(t / 1000) % 60)).slice(-2);
//	    if (total >= 3600000)
//		return tempHour + ":" + tempMinute + ":" + tempSecond;
//	    else
//		return tempMinute + ":" + tempSecond;
//	},
//	/******************* Player control ********************/
//
//	onPlaying: function () {
//
//	    if (self.firstTime) {
//		console.log("Playing");
//		self.onResize();
//		self.firstTime = false;
//	    }
//
//	},
//	onPositionChanged: function (position) {
//
//	    $(self.ui.progress_seen).css("width", (position * 100) + "%");
//
//	},
//	onTimeChanged: function (t) {
//
//	    if (t > 0) {
//
//		var t_str = self.parseTime(t, self.vlc.length);
//		$(self.ui.time_current).text(t_str);
//
//	    } else if ($(self.ui.time_current).text() != ""
//		    && $(self.ui.time_total).text() != "") {
//
//		$(self.ui.time_current).text("");
//	    }
//
//	},
//	/******************* Player interface ********************/
//
//	mouseMoved: function (e) {
//	    if (self.seekDrag) {
//		var rect = self.ui.wrapper[0].getBoundingClientRect();
//		var p = (e.pageX - rect.left) / (rect.right - rect.left);
//		self.ui.progress_seen.css("width", (p * 100) + "%");
//
//		var newtime = Math.floor(this.vlc.length * ((e.pageX - rect.left) / self.ui.wrapper.width()));
//		if (newtime > 0) {
//		    self.ui.tooltip_inner.text(self.parseTime(newtime));
//		    var offset = Math.floor(self.ui.tooltip.width() / 2);
//		    if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset)) {
//
//			self.ui.tooltip.css("left", ((e.pageX - rect.left) - offset) + "px");
//		    } else if (e.pageX < (rect.left + offset)) {
//
//			self.ui.tooltip.css("left", rect.left + "px");
//		    } else if (e.pageX > (rect.right - offset)) {
//
//			self.ui.tooltip.css("left", (rect.right - self.ui.tooltip.width()) + "px");
//		    }
//
//		    self.ui.tooltip.show();
//		}
//	    }
//
//	    if (self.volDrag) {
//		var rect = self.ui.vol_bar[0].getBoundingClientRect();
//		p = (e.pageX - rect.left) / (rect.right - rect.left);
//		self.changeVolume(Math.floor(200 * p) + 5);
//	    }
//	},
//	mouseClickEnd: function (e) {
//
//
//	    if (self.seekDrag) {
//		var rect = self.ui.wrapper[0].getBoundingClientRect();
//		self.seekDrag = false;
//		var p = (e.pageX - rect.left) / (rect.right - rect.left);
//		self.ui.progress_seen.css("width", (p * 100) + "%");
//		self.vlc.position = p;
//		self.ui.time_current.text(self.ui.tooltip_inner.text());
//	    }
//
//	    if (self.volDrag) {
//		self.volDrag = false;
//		var rect = self.ui.vol_bar[0].getBoundingClientRect();
//
//		if (e.pageX >= rect.right) {
//		    p = 1;
//		    setTimeout(function () {
//			self.ui.vol_control.animate({width: 0}, 200);
//		    }, 1500);
//
//		} else if (e.pageX <= rect.left) {
//		    p = 0;
//		    setTimeout(function () {
//			self.ui.vol_control.animate({width: 0}, 200);
//		    }, 1500);
//		} else {
//
//		    p = (e.pageX - rect.left) / (rect.right - rect.left);
//		    if (e.pageY < rect.top)
//			setTimeout(function () {
//			    self.ui.vol_control.animate({width: 0}, 200);
//			}, 1500);
//		    else if (e.pageY > rect.bottom)
//			setTimeout(function () {
//			    self.ui.vol_control.animate({width: 0}, 200);
//			}, 1500);
//		}
//		self.changeVolume(Math.floor(200 * p) + 5);
//	    }
//
//	},
//	hideNewProgressPosition: function (e) {
//	    if (self.seekDrag == false) {
//		self.ui.tooltip.hide();
//	    }
//	},
//	selectNewProgressPosition: function (e) {
//	    if (self.vlc.length) {
//
//		var rect = self.ui.wrapper[0].getBoundingClientRect();
//		if (e.pageX >= rect.left && e.pageX <= rect.right) {
//
//		    var newtime = Math.floor(self.vlc.length * ((e.pageX - rect.left) / self.ui.wrapper.width()));
//		    if (newtime > 0) {
//
//			self.ui.tooltip_inner.text(self.parseTime(newtime));
//			var offset = Math.floor(self.ui.tooltip.width() / 2);
//			if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset)) {
//
//			    self.ui.tooltip.css("left", ((e.pageX - rect.left) - offset) + "px");
//			} else if (e.pageX < (rect.left + offset)) {
//
//			    self.ui.tooltip.css("left", rect.left + "px");
//			} else if (e.pageX > (rect.right - offset)) {
//
//			    self.ui.tooltip.css("left", (rect.right - self.ui.tooltip.width()) + "px");
//			}
//
//			self.ui.tooltip.show();
//		    }
//		} else {
//
//		    self.ui.tooltip.hide();
//		}
//	    }
//	},
//	changeVolume: function (newVolume) {
//
//	    if (typeof newVolume !== 'undefined' && !isNaN(newVolume) && newVolume >= 0 && newVolume <= 5) {
//		this.lastVolume = this.vlc.volume;
//		this.vlc.volume = 0;
//
//		if (!this.vlc.mute) {
//
//		}
//
//	    } else if (newVolume && !isNaN(newVolume) && newVolume > 5 && newVolume <= 200) {
//
//		if (this.vlc.mute) {
//		    this.vlc.mute = false;
//		}
//
//		this.ui.vol_button.removeClass("wcp-mute");
//
//		if (newVolume > 150) {
//
//		    this.ui.vol_button
//			    .removeClass("wcp-volume-medium")
//			    .removeClass("wcp-volume-low")
//			    .addClass("wcp-volume-high");
//
//		} else if (newVolume > 50) {
//
//		    this.ui.vol_button
//			    .removeClass("wcp-volume-high")
//			    .removeClass("wcp-volume-low")
//			    .addClass("wcp-volume-medium");
//
//		} else {
//
//		    this.ui.vol_button
//			    .removeClass("wcp-volume-medium")
//			    .removeClass("wcp-volume-high")
//			    .addClass("wcp-volume-low");
//		}
//
//		this.ui.vol_bar_full.css("width", (((newVolume / 200) * parseInt(this.ui.vol_bar.css("width"))) - parseInt(this.ui.vol_bar_pointer.css("width"))) + "px");
//		this.vlc.volume = parseInt(newVolume);
//
//	    } else
//		return this.vlc.volume;
//	},
    });

})(window.App);
