console.log("Start");

fse.removeSync(process.env.PWD + '/chrip.log');

intel.addHandler(new intel.handlers.File({
    file: process.env.PWD + '/chrip.log',
    formatter: new intel.Formatter({
	format: '[%(date)s]:[%(levelname)s] %(name)s:: %(message)s',
    }),
}));

intel.addHandler(new intel.handlers.Console({
    formatter: new intel.Formatter({
	format: '[%(levelname)s] %(name)s:: %(message)s',
    }),
}));

intel.info("\n\n --------- [System start] --------- \n");


define(['settings'], function (Settings) {
    return {
	initialize: function () {
	    var d = Q.defer();
	    intel.info("initialize...");
	    App = new Backbone.Marionette.Application();

	    _.extend(App, {
		Controller: {},
		View: {
		    MainWindow: {},
		    SongService: {
			Authors: {},
			PlayList: {},
			Songs: {},
			Slides: {}
		    },
		    Bible: {
			Slides: {},
		    },
		    Media: {
			Elements: {},
		    },
		    Settings: {},
		    Common: {
			Slides: {},
			ItemList: {},
			Forms: {},
		    },
		    BlockScreens: {
			Slides: {},
			Elements: {},
			Editor: {},
			Groups: {},
			Helper: {},
		    },
		},
		Model: {
		    SongService: {
			Authors: {},
			PlayList: {},
			Songs: {},
			Slides: {},
			Elements: {},
		    },
		    SongEditor: {},
		    Bible: {
			Slides: {},
		    },
		    Media: {
			Elements: {},
		    },
		    Common: {
			Slides: {},
			ItemList: {}
		    },
		    BlockScreens: {
			Editor: {},
			Elements: {},
			Groups: {},
			Slides: {},
		    },
		},
		ControlWindow: null,
		Presentation: {},
		Settings: {},
		Localization: {},
		Database: {},
		SplashScreen: {},
		presentation_state: false,
		active_mode: false,
	    });

	    App.ViewStack = [];

	    App.addRegions({
		Window: '#main-window-region'
	    });

	    App.ControlWindow = win;

	    App.addInitializer(function (options) {

		intel.info("Chrip initializer");

		win.maximize();
		win.setResizable(false);
		win.show();
//	win.on("close", closeApp)
		try {
		    console.log(App.Window);
		    App.Window.show(new App.View.MainWindow.Root());
		} catch (e) {
		    console.log(e);
		    intel.error('Couldn\'t start app: %s, %s', e, e.stack);
		}

	    });

	    gui.Screen.Init();

	    Settings.Config.execDir = process.env.PWD;
	    Settings.Config.runDir = process.env.PWD;

	    var init_queue = [
		initTemplates(),
		initModels(),
		initViews(),
		getMac(Settings)
	    ];

	    Q.all(init_queue).then(function () {
		intel.info("initialized");
		d.resolve(true);

	    });

	    return d.promise;
	},
    }
});


var getMac = function (Settings) {

    intel.info("getMac");

    var d = Q.defer();
    require('getmac').getMac(
	    function (err, macAddress) {
		if (err) {
		    intel.error(new Error(err));
		}

		Settings.Config.mac = macAddress;
		intel.info("MAC: %s", Settings.Config.mac);
		d.resolve(Settings.Config.mac);
	    }
    );
    return d.promise;
};


var initTemplates = function () {

    intel.info("Init templates : started");
    /* Read all files from /templates directory */

    function get_tpl_files() {
	var d = Q.defer();
	var f = [];
	klaw('templates')
		.on('data', function (item) {
		    if (item.stats.isFile()) {
			f.push(item.path);
		    }
		})
		.on('error', function (err, item) {
		    intel.error("%:2j on %s", new Error(err), item.path);
		    throw new Error(err);
		})
		.on('end', function () {
		    d.resolve(f);
		});

	return d.promise;
    }

    function add_tpl_into_dom(items) {
	var ts = []; // files, directories, symlinks, etc
	var d = Q.defer();
	items.forEach(function (item) {
	    fse.readFile(item, function (err, data) {
		if (err) {
		    intel.error("%:2j", new Error(err));
		    throw new Error(err);
		}

		var tpl = document.createElement('script');
		tpl.setAttribute('type', "text/x-template");
		tpl.setAttribute('id', path.basename(item, '.tpl') + "-tpl");
		tpl.innerHTML = data;
		document.body.appendChild(tpl);
		intel.info(path.basename(item, '.tpl') + "-tpl");
		d.resolve(true);
	    });

	    ts.push(d.promise);
	});
	return Q.all(ts);
    }

    var d = Q.defer();
    get_tpl_files().then(add_tpl_into_dom).then(function () {
	intel.info("Init templates : ready");
	d.resolve(true);
    });

    return d.promise;
};

var initModels = function () {

    intel.info("Init models : started");

    /* Read all files from /templates directory */

    function get_models_files() {
	var d = Q.defer();
	var f = [];
	klaw('models')
		.on('data', function (item) {
		    if (item.stats.isFile()) {
			f.push(item.path);
		    }
		})
		.on('error', function (err, item) {
		    intel.error("%:2j on %s", new Error(err), item.path);
		    throw new Error(err);
		})
		.on('end', function () {
		    d.resolve(f);
		});

	return d.promise;
    }

    function add_models_into_dom(items) {
	var ts = []; // files, directories, symlinks, etc
	var d = Q.defer();
	items.forEach(function (item) {
	    fse.readFile(item, function (err, data) {
		if (err) {
		    intel.error("%:2j", new Error(err));
		    throw new Error(err);
		}

		var model = document.createElement('script');
//		tpl.setAttribute('type', "text/x-template");
		model.innerHTML = data;
		document.body.appendChild(model);
		intel.info(path.basename(item));
		d.resolve(true);
	    });

	    ts.push(d.promise);
	});
	return Q.all(ts);
    }

    var d = Q.defer();
    get_models_files().then(add_models_into_dom).then(function () {
	intel.info("Init models : ready");
	d.resolve(true);
    });

    return d.promise;
};

var initViews = function () {

    intel.info("Init views : started");

    /* Read all files from /templates directory */

    function get_view_directories() {
	var d = Q.defer();

	var dirs = [];

	klaw('views')
		.on('data', function (item) {
		    if (item.stats.isDirectory()) {
			dirs.push(item.path);
		    }
		})
		.on('error', function (err, item) {
		    intel.error("%:2j on %s", new Error(err), item.path);
		    throw new Error(err);
		})
		.on('end', function () {

		    for (var i = 0; i < dirs.length; i++) {
			if (dirs[i].indexOf('common_parts') > -1) {
			    var dir = dirs[i];
			    dirs.splice(i, 1);
			    dirs.unshift(dir);
			    break;
			}
		    }

		    d.resolve(dirs);
		});
	return d.promise;
    }

    function get_files(dir) {
	var d = Q.defer();
	var f = [];
	klaw(dir)
		.on('data', function (item) {
		    if (item.stats.isFile()) {
			f.push(item.path);
		    }
		})
		.on('error', function (err, item) {
		    intel.error("%:2j on %s", new Error(err), item.path);
		    throw new Error(err);
		})
		.on('end', function () {

		    d.resolve(f);
		});
	return d.promise;
    }

    function get_view_files(dirs) {
	var d = Q.defer();
	var f = [];

	/* Load common_files folder first */

	var common_dir = dirs.shift();
	get_files(common_dir)
		.then(function (files) {

		    f = f.concat(files);

		    var p = [];

		    dirs.forEach(function (dir) {
			p.push(get_files(dir));
		    });

		    Q.all(p).then(function (result) {

			result.forEach(function (files) {
			    f = f.concat(files);
			});

			console.log(f);
			d.resolve(f)
		    });
		});

	return d.promise;
    }

    function add_views_into_dom(items) {
	console.log(items);
	var ts = []; // files, directories, symlinks, etc
	var d = Q.defer();
	items.forEach(function (item) {
	    fse.readFile(item, function (err, data) {
		if (err) {
		    intel.error("%:2j", new Error(err));
		    throw new Error(err);
		}

		var model = document.createElement('script');
//		tpl.setAttribute('type', "text/x-template");
		model.innerHTML = data;
		document.body.appendChild(model);
		intel.info(path.basename(item));
		d.resolve(true);
	    });

	    ts.push(d.promise);
	});
	return Q.all(ts);
    }

    var d = Q.defer();
    get_view_directories()
	    .then(get_view_files)
	    .then(add_views_into_dom)
	    .then(function () {
		intel.info("Init views : ready");
		d.resolve(true);
	    });

    return d.promise;
};