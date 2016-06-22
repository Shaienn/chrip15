var gui = require('nw.gui');
var win = gui.Window.get();
var os = require('os');
var Q = require('q');
var klaw = require('klaw');
var path = require('path');
var fse = require('fs-extra');
var fs = require('fs');
var intel = require('intel');
var sqlite3 = require('sqlite3').verbose();
var restify = require('restify');
var xml2js = require('xml2js');
var fontManager = require('font-manager-nw');
var assert = require('assert');

requirejs.config({
    paths: {
    }
});

var App = {};

requirejs([
    'app',
    'settings',
    'slidegenerator',
    'utils',
    'database',
    'update',
], function (Chrip, Settings, SlideGenerator, Utils, Database, Update) {

    Chrip.initialize().then(function () {
	App.Settings = Settings;
	App.Utils = Utils;
	App.SlideGenerator = SlideGenerator;
	Database.initialize().then(function () {
	    App.Database = Database;
	    Update.initialize().then(function () {
		console.log(App);
		App.start();
	    });
	});
    });
});