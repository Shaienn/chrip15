
/**
 * Created by shaienn on 02.09.15.
 */
'use strict';

define(function () {

    var log = require('intel').getLogger('database');
    var self;
    var Database = {
	initialize: function () {
	    self = this;
	    var d = Q.defer();
	    log.info("initialize...");

	    self.global_db = new sqlite3.Database(App.Settings.Config.runDir + App.Settings.GeneralSettings.global_db, function (err) {

		if (err) {
		    log.error("Opening database: %s is failed: \n%s", App.Settings.Config.runDir + App.Settings.GeneralSettings.global_db, err);
		    throw new Error(err);
		}

		self.db = new sqlite3.Database(':memory:', function (err) {

		    if (err) {
			log.error("Create database in memory failed: /n%s", err);
			throw new Error(err);
		    }

		    var preinit_queue = [
			self.prepare_userdb(),
			self.get_version(),
			self.create_in_memory_database()
		    ];

		    Q.all(preinit_queue).then(function () {
			log.info("initialized");
			d.resolve(true);
		    });
		});
	    });
	    return d.promise;
	},
	get_version: function () {
	    var d = Q.defer();
	    self.global_db.each("SELECT value FROM Parameters WHERE key = 'db_version'", function (err, row) {

		if (err != null) {
		    App.Settings.Config.songbase_version = 0;
		} else {
		    App.Settings.Config.songbase_version = row.value;
		}

		d.resolve(App.Settings.Config.songbase_version);
	    });
	    return d.promise;
	},
	create_in_memory_database: function () {

	    var d = Q.defer();
	    self.db.serialize(function () {

		self.db.run("CREATE TABLE IF NOT EXISTS [Authors] ([memid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[uaid] INTEGER NOT NULL,[gaid] INTEGER,[name] TEXT NOT NULL,[db] TEXT NOT NULL)");
		self.db.run("CREATE TABLE IF NOT EXISTS [Songs] ([memid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[usid] INTEGER NOT NULL,[uaid] INTEGER NOT NULL,[gsid] INTEGER,[gaid] INTEGER,[name] TEXT,[db] TEXT NOT NULL, [text] TEXT)");
		self.db.run("CREATE TABLE IF NOT EXISTS [Books] ([id] INTEGER NOT NULL PRIMARY KEY, [full_name] TEXT NOT NULL, [short_name] TEXT NOT NULL)");
		self.db.run("CREATE TABLE IF NOT EXISTS [Chapters] ([verses] NUMERIC, [bid] INTEGER, [cid] INTEGER, [content] TEXT)");


		/* Global db */

		self.db.exec("ATTACH'" + App.Settings.Config.runDir + App.Settings.GeneralSettings.global_db + "'AS webdb", function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		});

		self.db.run("INSERT INTO main.Authors (uaid, name, db, gaid) SELECT '0', name, '1', gaid FROM webdb.Authors");
		self.db.run("INSERT INTO main.Songs (usid, uaid, name, db, gsid, gaid, text) SELECT '0', '0', name, '1', gsid, gaid, text FROM webdb.Songs");
		self.db.exec("DETACH webdb");

		/* User db */

		self.db.exec("ATTACH'" + App.Settings.Config.runDir + App.Settings.GeneralSettings.user_db + "'AS userdb", function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		});

		self.db.run("INSERT INTO main.Authors (uaid, name, db, gaid) SELECT uaid, name, '2', gaid FROM userdb.Authors WHERE gaid LIKE 0");

		self.db.run("DELETE FROM main.Songs WHERE gsid IN (SELECT m.gsid FROM main.Songs m LEFT JOIN userdb.Songs u WHERE m.gsid = u.gsid)");
		self.db.run("INSERT INTO main.Songs (usid, uaid, name, db, gsid, gaid, text) SELECT usid, uaid, name, '2', gsid, gaid, text FROM userdb.Songs");
		self.db.exec("DETACH userdb");

		self.db.exec("CREATE VIRTUAL TABLE Songslist USING fts4(memid, name, text)");
		self.db.all("SELECT * FROM Songs", function (err, rows) {

		    if (err) {
			log.error(err);
			throw new Error(err);
		    }

		    var stmt = self.db.prepare("INSERT INTO Songslist (memid, name, text) VALUES (?, ?, ?)");
		    var rows_ts = [];

		    rows.forEach(function (row) {

			if (row.text == null)
			    return;

			var row_d = Q.defer();
			stmt.run(
				row.memid,
				row.name.toLowerCase(),
				row.text.toLowerCase(),
				function (err) {

				    if (err) {
					log.error(err);
					throw new Error(err);
				    }

				    row_d.resolve(true);
				});

			rows_ts.push(row_d.promise);
		    });

		    stmt.finalize();
		    Q.all(rows_ts).then(function (res) {
			d.resolve(true);
		    });
		});
	    });
	    return d.promise;
	},
	prepare_userdb: function () {
	    var d = Q.defer();
	    /* Check user.db, create tables if not exists */

	    self.user_db = new sqlite3.Database(App.Settings.Config.runDir + App.Settings.GeneralSettings.user_db);
	    self.user_db.serialize(function () {

		self.user_db.run("CREATE TABLE IF NOT EXISTS [Authors] ([uaid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[name] TEXT NOT NULL,[gaid] INTEGER)");

		self.user_db.run("CREATE TABLE IF NOT EXISTS [GeneralSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");
		self.user_db.run("CREATE TABLE IF NOT EXISTS [SongserviceSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");
		self.user_db.run("CREATE TABLE IF NOT EXISTS [BibleSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");

		self.user_db.run("CREATE TABLE IF NOT EXISTS [Songs] ([usid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[uaid] INTEGER NOT NULL, [name] TEXT NOT NULL, [gaid] INTEGER, [gsid] INTEGER, [text] TEXT)");
		self.user_db.run("CREATE TABLE IF NOT EXISTS [BackDirs] ([bd_id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [bd_path] TEXT NOT NULL)");
		self.user_db.run("CREATE TABLE IF NOT EXISTS [ForApprove] ([id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [gaid] INTEGER, [uaid] INTEGER, [gsid] INTEGER, [usid] INTEGER, [singer_name] VARCHAR(255), [song_name] VARCHAR(255), [song_text] TEXT)");

		self.user_db.run("CREATE TABLE IF NOT EXISTS [LastSongs] ([gsid] INTEGER, [usid] INTEGER)");


		self.user_db.run("CREATE TABLE IF NOT EXISTS [BlockScreensGroups] ([gid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [name] TEXT NOT NULL) ");
		self.user_db.run("CREATE TABLE IF NOT EXISTS [BlockScreensFiles] ([fid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [gid] INTEGER NOT NULL, [file] TEXT NOT NULL) ");

		/* If we have no settings inside database files, just add its defaults */


		var settings_table = [
		    "GeneralSettings",
		    "SongserviceSettings",
		    "BibleSettings"
		];

		var settings_promises = [];
		settings_table.forEach(function (settings_item) {

		    var sql = "INSERT OR IGNORE INTO " + settings_item + " (key, value) VALUES (?, ?)";
		    var stmt = self.user_db.prepare(sql);

		    Object.keys(App.Settings[settings_item]).forEach(function (key, key_index, key_array) {
			var s_d = Q.defer();
			stmt.run(key, App.Settings[settings_item][key], function (err) {

			    if (err) {
				log.error(err);
				throw new Error(err);
			    }

			    s_d.resolve(true);
			});

			settings_promises.push(s_d.promise);
		    });

		    stmt.finalize();
		});

		Q.all(settings_promises).then(function () {
		    d.resolve(true);
		});
	    });

	    return d.promise;
	},
	get_songs_for_approve: function () {

	    var d = Q.defer();

	    self.user_db.all("SELECT * FROM ForApprove", function (err, rows) {

		if (err) {
		    log.error(err);
		    throw new Error("Load author failed. Got error: " + err);
		}

		var loadedSongs = [];
		rows.forEach(function (item) {
		    loadedSongs.push({
			id: item.id,
			gaid: item.gaid,
			uaid: item.uaid,
			gsid: item.gsid,
			usid: item.usid,
			singer_name: item.singer_name,
			name: item.song_name,
			text: item.song_text
		    });
		});
		d.resolve(loadedSongs);
	    });
	    return d.promise;
	},
	add_song_for_approve: function (gaid, uaid, gsid, usid, singer_name, song_name, song_text) {

	    var d = Q.defer();

	    assert.ok(!isNaN(gaid));
	    assert.ok(!isNaN(uaid));
	    assert.ok(!isNaN(gsid));
	    assert.ok(!isNaN(usid));

	    /* Check is it already exist record with corresponding gaid, uaid, gsid and guid values */

	    var stmt = self.user_db.prepare("SELECT id FROM ForApprove WHERE gaid=? AND uaid=? AND gsid=? AND usid=?");
	    stmt.get(gaid, uaid, gsid, usid, function (err, row) {

		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		if (typeof row == "undefined") {

		    /* There is no record with that values, will create one */

		    var insert_stmt = self.user_db.prepare("INSERT INTO ForApprove (gaid, uaid, gsid, usid, singer_name, song_name, song_text) VALUES (?,?,?,?,?,?,?)");
		    insert_stmt.run(gaid, uaid, gsid, usid, singer_name, song_name, song_text, function (err) {

			if (err) {
			    log.error(err);
			    throw new Error(err);
			}
			d.resolve(true);
		    });
		    insert_stmt.finalize();

		} else if (!isNaN(row.id)) {

		    /* There is a record, will update this one */

		    var update_stmt = self.user_db.prepare("UPDATE ForApprove SET singer_name=?, song_name=?, song_text=? WHERE id=?");
		    update_stmt.run(singer_name, song_name, song_text, row.id, function (err) {

			if (err) {
			    log.error(err);
			    throw new Error(err);
			}
			d.resolve(true);
		    });
		    update_stmt.finalize();

		} else {
		    throw new Error("Wrong row.id value: " + row.id);
		}
	    });
	    stmt.finalize();
	    return d.promise;
	},
	/* Last songs part */

	get_last_songs: function () {
	    var d = Q.defer();

	    self.user_db.all("SELECT * FROM LastSongs", function (err, rows) {

		if (err) {
		    log.error("SELECT * FROM LastSongs failed: ", err);
		    throw new Error(err);
		}

		var loadedSongs = [];
		var load_promises = [];
		var stmt = self.db.prepare("SELECT Songs.* FROM Songs WHERE Songs.gsid LIKE ? AND Songs.usid LIKE ? LIMIT 1");
		rows.forEach(function (last_song_item) {
		    var load_promise = Q.defer();

		    stmt.get(last_song_item.gsid, last_song_item.usid, function (err, item) {
			if (err) {
			    log.error(err);
			    throw new Error(err);
			}

			var song = new App.Model.SongService.Elements.Element();
			song.set('name', item.name);
			song.set('db', item.db);
			song.set('uaid', item.uaid);
			song.set('gaid', item.gaid);
			song.set('usid', item.usid);
			song.set('gsid', item.gsid);
			song.set('text', item.text);

			loadedSongs.push(song);
			load_promise.resolve(true);
		    });

		    load_promises.push(load_promise.promise);
		});
		stmt.finalize();

		Q.all(load_promises).then(function () {
		    d.resolve(loadedSongs);
		});
	    });

	    return d.promise;
	},
	add_song_to_last_songs: function (song) {

	    var d = Q.defer();

	    assert.ok(song instanceof App.Model.SongService.Elements.Element);

	    var stmt = self.user_db.prepare("INSERT INTO LastSongs (gsid, usid) VALUES (?,?)");
	    stmt.run(song.get('gsid'), song.get('usid'), function (err) {

		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		d.resolve(true);
	    });
	    stmt.finalize();

	    return d.promise;
	},
	remove_song_from_last_songs: function (song) {
	    var d = Q.defer();

	    assert.ok(song instanceof App.Model.SongService.Elements.Element);

	    var stmt = self.user_db.prepare("DELETE FROM LastSongs WHERE gsid = ? AND usid = ?");
	    stmt.run(song.get('gsid'), song.get('usid'), function (err) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}
		d.resolve(true);
	    });
	    stmt.finalize();
	    return d.promise;
	},
	remove_all_songs_from_last_songs: function () {
	    var d = Q.defer();
	    self.user_db.run("DELETE FROM LastSongs", [], function (err) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		d.resolve(true);
	    });
	    return d.promise;
	},
	/* Blockscreens part */
	checkFileUsage: function (file) {
	    var d = Q.defer();
	    console.log(file);
	    var stmt = self.user_db.prepare("SELECT COUNT(*) as count FROM BlockScreensFiles WHERE file = ?");
	    stmt.get(file, function (err, row) {

		console.log(row);

		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		d.resolve(row.count);
	    });

	    return d.promise;
	},
	removeFileFromBlockScreenGroup: function (blockscreen) {
	    console.log(blockscreen);
	    assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
	    var d = Q.defer();
	    var stmt = self.user_db.prepare("DELETE FROM BlockScreensFiles WHERE gid = ? AND file = ?");
	    stmt.run(
		    blockscreen.get('gid'), blockscreen.get('file'), function (err) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}



		d.resolve(true);
	    });
	    stmt.finalize();
	    return d.promise;
	},
	find_file_in_blockscreen_group: function (blockscreen) {
	    assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
	    var d = Q.defer();
	    var stmt = self.user_db.prepare("SELECT COUNT(*) as count FROM BlockScreensFiles WHERE gid = ? AND file = ?");
	    stmt.get(
		    blockscreen.get('gid'), blockscreen.get('file'), function (err, row) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}
		d.resolve(row.count);
	    });
	    stmt.finalize();
	    return d.promise;
	},
	add_file_to_blockscreen_group: function (blockscreen) {

	    assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
	    var d = Q.defer();

	    this.find_file_in_blockscreen_group(blockscreen)
		    .then(function (count) {
			console.log(count);
			if (count) {
			    d.resolve(true);
			} else {
			    var stmt = self.user_db.prepare("INSERT INTO BlockScreensFiles (gid, file) VALUES (?,?)");
			    stmt.run(
				    blockscreen.get('gid'), blockscreen.get('file'), function (err) {
				if (err) {
				    log.error(err);
				    throw new Error(err);
				}
				d.resolve(true);
			    });
			    stmt.finalize();
			}
		    });
	    return d.promise;
	},
	remove_block_screen_group: function (group) {
	    assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);

	    function remove_bs_files(files) {

		console.log('remove_bs_files');

		var files_queue = [];

		files.forEach(function (file) {
		    var d = Q.defer();
		    console.log(file);
		    var file_path = file.file;
		    self.checkFileUsage(file_path)
			    .then(function (count) {

				log.info("Files in usage: %d", count);

				if (count == 1) {
				    fse.remove(file_path, function (err) {

					if (err)
					    return console.error(err);
					d.resolve(true);
				    });
				} else {
				    d.resolve(true);
				}
			    });
		    files_queue.push(d.promise);
		});

		return Q.all(files_queue);
	    }

	    var d = Q.defer();
	    var stmt = self.user_db.prepare("DELETE FROM BlockScreensGroups WHERE gid = ?");
	    stmt.get(group.get('gid'), function (err) {

		if (err)
		    throw new Error(err);

		self.getBlockScreenFiles(group)
			.then(remove_bs_files)
			.then(function () {
			    stmt = self.user_db.prepare("DELETE FROM BlockScreensFiles WHERE gid = ?");
			    stmt.run(group.get('gid'), function (err) {
				if (err)
				    throw new Error(err);

				d.resolve(true);
			    });
			});
	    });

	    return d.promise;
	},
	saveBlockScreenGroup: function (group) {
	    var d = Q.defer();

	    assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);
	    if ((typeof group.get('gid') != "undefined") && (group.get('gid') != null)) {
		var stmt = self.user_db.prepare("UPDATE BlockScreensGroups SET name = ? WHERE gid = ?");
		stmt.run(
			group.get('name'),
			group.get('gid'), function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		    d.resolve(true);
		});
	    } else {
		var stmt = self.user_db.prepare("INSERT INTO BlockScreensGroups (name) VALUES (?)");
		stmt.run(
			group.get('name'), function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		    d.resolve(true);
		});
	    }
	    stmt.finalize();
	    return d.promise;
	},
	getBlockScreenFiles: function (group) {
	    var d = Q.defer();

	    assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);

	    var gid = group.get('gid');
	    var loadedBlockScreensFiles = [];

	    var stmt = self.user_db.prepare("SELECT fid, file FROM BlockScreensFiles WHERE gid = ?");
	    stmt.all(gid, function (err, rows) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		rows.forEach(function (item) {
		    loadedBlockScreensFiles.push(item);
		});

		d.resolve(loadedBlockScreensFiles);
	    });
	    stmt.finalize();
	    return d.promise;
	},
	get_blockscreen_groups: function () {
	    var d = Q.defer();

	    var loadedBlockScreensGroups = [];

	    /* Add default group */

	    var stmt = self.user_db.prepare("SELECT * FROM BlockScreensGroups");
	    stmt.all(function (err, rows) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		rows.forEach(function (item) {

		    var bsg = new App.Model.BlockScreens.Groups.Element;
		    bsg.set('gid', item.gid);
		    bsg.set('name', item.name);

		    loadedBlockScreensGroups.push(bsg);
		});

		d.resolve(loadedBlockScreensGroups);

	    });

	    return d.promise;
	},
	/* Authors part */
	load_singers: function () {

	    var d = Q.defer();

	    self.db.all("SELECT * FROM Authors", function (err, rows) {

		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		var loadedAuthors = [];

		rows.forEach(function (row) {

		    var singer = new App.Model.Author({
			name: row.name,
			gaid: row.gaid,
			uaid: row.uaid,
			db: row.db,
		    });

		    loadedAuthors.push(singer);

		});

		d.resolve(loadedAuthors);

	    });

	    return d.promise;
	},
	get_singer: function (gaid, uaid) {
	    var d = Q.defer();

	    assert.ok(!isNaN(gaid));
	    assert.ok(!isNaN(uaid));

	    var stmt = App.Database.db.prepare("SELECT * FROM Authors WHERE gaid = ? AND uaid = ?");
	    stmt.get(gaid, uaid, function (err, row) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		var singer = new App.Model.Author({
		    name: row.name,
		    gaid: row.gaid,
		    uaid: row.uaid,
		    db: row.db,
		});

		d.resolve(singer);
	    });
	    stmt.finalize();

	    return d.promise;
	},
	remove_singer: function (singer) {

	    var d = Q.defer();

	    assert.ok(singer instanceof App.Model.Author);
	    assert.ok(!isNaN(singer.get('uaid')));

	    if (singer.get('db') == '2') {

		/* We only delete local authors */

		var stmt = self.user_db.prepare("DELETE FROM Authors WHERE uaid = ?");
		stmt.run(singer.get('uaid'), function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		    d.resolve(true);
		});
		stmt.finalize();
	    }

	    return d.promise;
	},
	save_singer: function (singer) {

	    assert.ok(singer instanceof App.Model.Author);

	    switch (singer.get('db')) {

		case ('1'):

		    /* It is a global author, so create a new author in local db */
		    assert.ok(!isNaN(singer.get('gaid')));
		    var stmt = self.user_db.prepare("INSERT INTO Authors (name, gaid) VALUES (?,?)");
		    stmt.run(singer.get('name'), singer.get('gaid'));
		    stmt.finalize();

		    break;
		case ('2'):

		    /* It is a local author, update  */
		    assert.ok(!isNaN(singer.get('uaid')));
		    var stmt = self.user_db.prepare("UPDATE Authors SET name = ? WHERE uaid = ?");
		    stmt.run(singer.get('name'), singer.get('uaid'));
		    stmt.finalize();

		    break;
		case ('0'):

		    /* New author, create */

		    var stmt = self.user_db.prepare("INSERT INTO Authors (name, gaid) VALUES (?,?)");
		    stmt.run(singer.get('name'), '0');
		    stmt.finalize();

		    break;
		default:
		    log.error('Unknown author`s DB');
		    return;
	    }
	},
	/* Songs part */
	load_songs: function (singer) {
	    var d = Q.defer();

	    assert.ok(!isNaN(singer.get('uaid')));
	    assert.ok(!isNaN(singer.get('gaid')));

	    var stmt = self.db.prepare("SELECT Songs.* FROM Songs WHERE Songs.uaid LIKE ? AND Songs.gaid LIKE ? ORDER BY Songs.name");
	    stmt.all(singer.get('uaid'), singer.get('gaid'), function (err, rows) {
		if (err) {
		    log.error(err);
		    throw new Error(err);
		}

		var loadedSongs = [];
		rows.forEach(function (item, i, arr) {
		    loadedSongs.push({
			name: item.name,
			db: item.db,
			uaid: item.uaid,
			gaid: item.gaid,
			usid: item.usid,
			gsid: item.gsid,
			text: item.text,
		    });
		});
		d.resolve(loadedSongs);
	    });
	    stmt.finalize();
	    return d.promise;
	},
	remove_song: function (song) {
	    var d = Q.defer();

	    assert.ok(song instanceof App.Model.SongService.Elements.Element);
	    assert.ok(!isNaN(song.get('usid')));

	    if (song.get('db') == '2') {

		/* We only delete local authors */

		var stmt = self.user_db.prepare("DELETE FROM Songs WHERE usid = ?");
		stmt.run(song.get('usid'), function (err) {
		    if (err) {
			log.error(err);
			throw new Error(err);
		    }
		    d.resolve(true);
		});
		stmt.finalize();
	    } else {
		d.resolve(false);
	    }
	    return d.promise;
	},
	save_song: function (song) {

	    var d = Q.defer();

	    assert.ok(song instanceof App.Model.SongService.Elements.Element);

	    switch (song.get('db')) {

		case ('1'):

		    /* It is a global song, so create a new song in local db */

		    var stmt = self.user_db.prepare("INSERT INTO Songs (uaid, name, gaid, gsid, text) VALUES (?,?,?,?,?)");
		    stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), song.get('gsid'), song.get('text'), function (err) {

			if (err) {
			    log.error(err);
			    throw new Error(err);
			}

			var song_id = this.lastID;
			self.getSinger(
				song.get('gaid'),
				song.get('uaid')
				).then(
				function (singer_name) {
				    self.add_song_for_approve(
					    song.get('gaid'),
					    song.get('uaid'),
					    song.get('gsid'),
					    song_id,
					    singer_name,
					    song.get('name'),
					    song.get('text')
					    ).then(
					    function () {
						d.resolve(true);
					    }
				    );
				});
		    });

		    break;
		case ('2'):

		    /* It is a local song, update  */

		    var stmt = self.user_db.prepare("UPDATE Songs SET uaid = ?, name = ?, gaid = ?, gsid = ?, text = ? WHERE usid = ?");
		    stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), song.get('gsid'), song.get('text'), song.get('usid'), function (err) {

			if (err) {
			    log.error(err);
			    d.reject(new Error(err));
			}

			self.get_singer(
				song.get('gaid'),
				song.get('uaid')
				).then(function (singer_name) {
			    self.add_song_for_approve(
				    song.get('gaid'),
				    song.get('uaid'),
				    song.get('gsid'),
				    song.get('usid'),
				    singer_name,
				    song.get('name'),
				    song.get('text')
				    ).then(
				    function () {
					d.resolve(true);
				    }
			    );
			});
		    });

		    break;
		case ('0'):

		    /* New song, create */

		    var stmt = self.user_db.prepare("INSERT INTO Songs (uaid, name, gaid, gsid, text) VALUES (?,?,?,?,?)");
		    stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), "0", song.get('text'), function (err) {

			if (err) {
			    log.error(err);
			    throw new Error(err);
			}

			var song_id = this.lastID;
			self.get_singer(
				song.get('gaid'),
				song.get('uaid')
				).then(
				function (singer_name) {
				    self.add_song_for_approve(
					    song.get('gaid'),
					    song.get('uaid'),
					    0,
					    song_id,
					    singer_name,
					    song.get('name'),
					    song.get('text')
					    ).then(
					    function () {
						d.resolve(true);
					    }
				    );
				});
		    });
		    break;
		default:
		    throw new Error('Unknown song`s DB');

	    }

	    return d.promise;

	},
    };
    return Database;

//    return {
//	Database: {
//	    db: {},
//	    user_db: {},
//	    global_db: {},
//	    user_db_check: function () {
//
//		var d = Q.defer();
//		/* Check user.db, create tables if not exists */
//
//		App.Database.user_db = new sqlite3.Database(App.Config.runDir + Settings.GeneralSettings.user_db);
//		App.Database.user_db.serialize(function () {
//
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [Authors] ([uaid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[name] TEXT NOT NULL,[gaid] INTEGER)");
//
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [GeneralSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [SongserviceSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [BibleSettings] ([key] TEXT NOT NULL PRIMARY KEY, [value] TEXT NOT NULL)");
//
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [Songs] ([usid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[uaid] INTEGER NOT NULL, [name] TEXT NOT NULL, [gaid] INTEGER, [gsid] INTEGER, [text] TEXT)");
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [BackDirs] ([bd_id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [bd_path] TEXT NOT NULL)");
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [ForApprove] ([id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [gaid] INTEGER, [uaid] INTEGER, [gsid] INTEGER, [usid] INTEGER, [singer_name] VARCHAR(255), [song_name] VARCHAR(255), [song_text] TEXT)");
//
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [LastSongs] ([gsid] INTEGER, [usid] INTEGER)");
//
//
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [BlockScreensGroups] ([gid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [name] TEXT NOT NULL) ");
//		    App.Database.user_db.run("CREATE TABLE IF NOT EXISTS [BlockScreensFiles] ([fid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, [gid] INTEGER NOT NULL, [file] TEXT NOT NULL) ");
//
//		    /* If we have no settings inside database files, just add its defaults */
//
//
//		    var settings_table = [
//			"GeneralSettings",
//			"SongserviceSettings",
//			"BibleSettings"
//		    ];
//
//		    var settings_promises = [];
//		    settings_table.forEach(function (settings_item, table_index, table_array) {
//
//			var sql = "INSERT OR IGNORE INTO " + settings_item + " (key, value) VALUES (?, ?)";
//			var stmt = App.Database.user_db.prepare(sql);
//
//			Object.keys(Settings[settings_item]).forEach(function (key, key_index, key_array) {
//			    var s_d = Q.defer();
//			    stmt.run(key, Settings[settings_item][key], function (err) {
//
//				if (err) {
//				    log.error(err);
//				    throw new Error(err);
//				}
//
//				s_d.resolve(true);
//			    });
//
//			    settings_promises.push(s_d.promise);
//			});
//
//			stmt.finalize();
//		    });
//
//		    Q.all(settings_promises).then(function () {
//			d.resolve(true);
//		    });
//		});
//
//		return d.promise;
//	    },
//	    close: function () {
//
//		var d = Q.defer();
//		App.Database.db.close(function () {
//		    App.Database.global_db.close(function () {
//			App.Database.user_db.close(function () {
//			    d.resolve();
//			});
//		    });
//		});
//		return d.promise;
//	    },
//	    init: function () {
//
//		var d = Q.defer();
//		log.info('init');
//		App.Database.global_db = new sqlite3.Database(App.Config.runDir + Settings.GeneralSettings.global_db, function (err) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    App.Database.db = new sqlite3.Database(':memory:', function (err) {
//
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//
//			App.Database.user_db_check().then(function () {
//			    App.Database.getVersion().then(function () {
//				App.Database.db.serialize(function () {
//
//				    App.Database.db.run("CREATE TABLE IF NOT EXISTS [Authors] ([memid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[uaid] INTEGER NOT NULL,[gaid] INTEGER,[name] TEXT NOT NULL,[db] TEXT NOT NULL)");
//				    App.Database.db.run("CREATE TABLE IF NOT EXISTS [Songs] ([memid] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,[usid] INTEGER NOT NULL,[uaid] INTEGER NOT NULL,[gsid] INTEGER,[gaid] INTEGER,[name] TEXT,[db] TEXT NOT NULL, [text] TEXT)");
//				    App.Database.db.run("CREATE TABLE IF NOT EXISTS [Books] ([id] INTEGER NOT NULL PRIMARY KEY, [full_name] TEXT NOT NULL, [short_name] TEXT NOT NULL)");
//				    App.Database.db.run("CREATE TABLE IF NOT EXISTS [Chapters] ([verses] NUMERIC, [bid] INTEGER, [cid] INTEGER, [content] TEXT)");
//
//
//				    /* Global db */
//
//				    App.Database.db.exec("ATTACH'" + App.Config.runDir + Settings.GeneralSettings.global_db + "'AS webdb", function (err) {
//					if (err) {
//					    log.error(err);
//					    throw new Error(err);
//					}
//				    });
//
//				    App.Database.db.run("INSERT INTO main.Authors (uaid, name, db, gaid) SELECT '0', name, '1', gaid FROM webdb.Authors");
//				    App.Database.db.run("INSERT INTO main.Songs (usid, uaid, name, db, gsid, gaid, text) SELECT '0', '0', name, '1', gsid, gaid, text FROM webdb.Songs");
//				    App.Database.db.exec("DETACH webdb");
//
//				    /* User db */
//
//				    App.Database.db.exec("ATTACH'" + App.Config.runDir + Settings.GeneralSettings.user_db + "'AS userdb", function (err) {
//					if (err) {
//					    log.error(err);
//					    throw new Error(err);
//					}
//				    });
//
//				    App.Database.db.run("INSERT INTO main.Authors (uaid, name, db, gaid) SELECT uaid, name, '2', gaid FROM userdb.Authors WHERE gaid LIKE 0");
//
//				    App.Database.db.run("DELETE FROM main.Songs WHERE gsid IN (SELECT m.gsid FROM main.Songs m LEFT JOIN userdb.Songs u WHERE m.gsid = u.gsid)");
//				    App.Database.db.run("INSERT INTO main.Songs (usid, uaid, name, db, gsid, gaid, text) SELECT usid, uaid, name, '2', gsid, gaid, text FROM userdb.Songs");
//				    App.Database.db.exec("DETACH userdb");
//
//				    App.Database.db.exec("CREATE VIRTUAL TABLE Songslist USING fts4(memid, name, text)");
//				    App.Database.db.all("SELECT * FROM Songs", function (err, rows) {
//
//					if (err) {
//					    log.error(err);
//					    throw new Error(err);
//					}
//
//					var stmt = App.Database.db.prepare("INSERT INTO Songslist (memid, name, text) VALUES (?, ?, ?)");
//					var rows_ts = [];
//
//					rows.forEach(function (row) {
//
//					    if (row.text == null)
//						return;
//
//					    var row_d = Q.defer();
//					    stmt.run(
//						    row.memid,
//						    row.name.toLowerCase(),
//						    row.text.toLowerCase(),
//						    function (err) {
//
//							if (err) {
//							    throw new Error(err);
//							}
//
//							row_d.resolve(true);
//						    });
//
//					    rows_ts.push(row_d.promise);
//					});
//
//					stmt.finalize();
//					Q.all(rows_ts).then(function (res) {
//					    d.resolve(true);
//					});
//				    });
//				});
//			    });
//			});
//		    });
//		});
//		return d.promise;
//	    },
//	    convert: function () {
//
//		App.Database.global_db.exec("ALTER TABLE Songs ADD COLUMN text TEXT");
//		App.Database.global_db.each("SELECT * FROM Authors", function (err, row) {
//
//		    if (err != null) {
//			log.error("Load author failed. Got error: " + err);
//		    }
//
//		    //log.info("Author - " + row);
//
//		    /* Select songs */
//
//		    var stmt = App.Database.global_db.prepare("SELECT Songs.* FROM Songs WHERE Songs.author_id LIKE ? ORDER BY Songs.name");
//		    stmt.each(row.author_id, function (err, row) {
//
//			if (err != null) {
//			    log.error("Load songs failed. Got error: " + err);
//			    return;
//			}
//
//			log.info("Song - " + row.song_id);
//
//
//			/* Load Texts */
//
//			var stmt = App.Database.global_db.prepare("SELECT * FROM Texts WHERE song_id LIKE ? ORDER BY part_id");
//			stmt.all(row.song_id, function (err, rows) {
//
//
//			    var song_id = null;
//			    var songText = "";
//
//			    rows.forEach(function (item, i, arr) {
//
//
//				song_id = parseInt(item.song_id);
//
//				songText += "\r\n{sos}\r\n";
//				songText += item.text;
//				songText += "\r\n{eos}\r\n";
//
//			    });
//
//			    log.info(JSON.stringify(song_id));
//
//			    if (typeof song_id == 'undefined') {
//				return;
//			    }
//
//
//			    var stmt = App.Database.global_db.prepare("UPDATE Songs SET text = ? WHERE song_id = ?");
//			    stmt.run(songText, song_id);
//
//			});
//
//		    });
//
//		});
//	    },
//	    checkFileUsage: function (file) {
//		var d = Q.defer();
//		console.log(file);
//		var stmt = App.Database.user_db.prepare("SELECT COUNT(*) as count FROM BlockScreensFiles WHERE file = ?");
//		stmt.get(file, function (err, row) {
//
//		    console.log(row);
//
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    d.resolve(row.count);
//		});
//
//		return d.promise;
//	    },
//	    removeFileFromBlockScreenGroup: function (blockscreen) {
//		console.log(blockscreen);
//		assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
//		var d = Q.defer();
//		var stmt = App.Database.user_db.prepare("DELETE FROM BlockScreensFiles WHERE gid = ? AND file = ?");
//		stmt.run(
//			blockscreen.get('gid'), blockscreen.get('file'), function (err) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//
//
//		    d.resolve(true);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    find_file_in_blockscreen_group: function (blockscreen) {
//		assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
//		var d = Q.defer();
//		var stmt = App.Database.user_db.prepare("SELECT COUNT(*) as count FROM BlockScreensFiles WHERE gid = ? AND file = ?");
//		stmt.get(
//			blockscreen.get('gid'), blockscreen.get('file'), function (err, row) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//		    d.resolve(row.count);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    add_file_to_blockscreen_group: function (blockscreen) {
//
//		assert.ok(blockscreen instanceof App.Model.BlockScreens.Elements.Element);
//		var d = Q.defer();
//
//		this.find_file_in_blockscreen_group(blockscreen)
//			.then(function (count) {
//			    console.log(count);
//			    if (count) {
//				d.resolve(true);
//			    } else {
//				var stmt = App.Database.user_db.prepare("INSERT INTO BlockScreensFiles (gid, file) VALUES (?,?)");
//				stmt.run(
//					blockscreen.get('gid'), blockscreen.get('file'), function (err) {
//				    if (err) {
//					log.error(err);
//					throw new Error(err);
//				    }
//				    d.resolve(true);
//				});
//				stmt.finalize();
//			    }
//			});
//		return d.promise;
//	    },
//	    remove_block_screen_group: function (group) {
//		var self = this;
//		assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);
//
//		function remove_bs_files(files) {
//
//		    console.log('remove_bs_files');
//
//		    var files_queue = [];
//
//		    files.forEach(function (file) {
//			var d = Q.defer();
//			console.log(file);
//			var file_path = file.file;
//			self.checkFileUsage(file_path)
//				.then(function (count) {
//
//				    log.info("Files in usage: %d", count);
//
//				    if (count == 1) {
//					fse.remove(file_path, function (err) {
//
//					    if (err)
//						return console.error(err);
//					    d.resolve(true);
//					});
//				    } else {
//					d.resolve(true);
//				    }
//				});
//			files_queue.push(d.promise);
//		    });
//
//		    return Q.all(files_queue);
//		}
//
//		var d = Q.defer();
//		var stmt = App.Database.user_db.prepare("DELETE FROM BlockScreensGroups WHERE gid = ?");
//		stmt.get(group.get('gid'), function (err) {
//
//		    if (err)
//			throw new Error(err);
//
//		    self.getBlockScreenFiles(group)
//			    .then(remove_bs_files)
//			    .then(function () {
//				stmt = App.Database.user_db.prepare("DELETE FROM BlockScreensFiles WHERE gid = ?");
//				stmt.run(group.get('gid'), function (err) {
//				    if (err)
//					throw new Error(err);
//
//				    d.resolve(true);
//				});
//			    });
//		});
//
//		return d.promise;
//	    },
//	    saveBlockScreenGroup: function (group) {
//		var d = Q.defer();
//
//		assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);
//		if ((typeof group.get('gid') != "undefined") && (group.get('gid') != null)) {
//		    var stmt = App.Database.user_db.prepare("UPDATE BlockScreensGroups SET name = ? WHERE gid = ?");
//		    stmt.run(
//			    group.get('name'),
//			    group.get('gid'), function (err) {
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//			d.resolve(true);
//		    });
//		} else {
//		    var stmt = App.Database.user_db.prepare("INSERT INTO BlockScreensGroups (name) VALUES (?)");
//		    stmt.run(
//			    group.get('name'), function (err) {
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//			d.resolve(true);
//		    });
//		}
//		stmt.finalize();
//		return d.promise;
//	    },
//	    getBlockScreenFiles: function (group) {
//		var d = Q.defer();
//
//		assert.ok(group instanceof App.Model.BlockScreens.Groups.Element);
//
//		var gid = group.get('gid');
//		var loadedBlockScreensFiles = [];
//
//		var stmt = App.Database.user_db.prepare("SELECT fid, file FROM BlockScreensFiles WHERE gid = ?");
//		stmt.all(gid, function (err, rows) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    rows.forEach(function (item) {
//			loadedBlockScreensFiles.push(item);
//		    });
//
//		    d.resolve(loadedBlockScreensFiles);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    getBlockScreensGroups: function () {
//		var d = Q.defer();
//
//		var loadedBlockScreensGroups = [];
//
//		/* Add default group */
//
//		var stmt = App.Database.user_db.prepare("SELECT * FROM BlockScreensGroups");
//		stmt.all(function (err, rows) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    rows.forEach(function (item) {
//
//			var bsg = new App.Model.BlockScreens.Groups.Element;
//			bsg.set('gid', item.gid);
//			bsg.set('name', item.name);
//
//			loadedBlockScreensGroups.push(bsg);
//		    });
//
//		    d.resolve(loadedBlockScreensGroups);
//
//		});
//
//		return d.promise;
//	    },
//	    getVersion: function () {
//
//		var d = Q.defer();
//		App.Database.global_db.each("SELECT value FROM Parameters WHERE key = 'db_version'", function (err, row) {
//
//		    if (err != null) {
//			Settings.Config.songbase_version = 0;
//		    } else {
//			Settings.Config.songbase_version = row.value;
//		    }
//
//		    d.resolve(Settings.Config.songbase_version);
//		});
//		return d.promise;
//	    },
//	    loadSettings: function () {
//
//		var settings_table = [
//		    "GeneralSettings",
//		    "SongserviceSettings",
//		    "BibleSettings"
//		];
//
//		var settings_promises = [];
//
//		settings_table.forEach(function (settings_item) {
//		    var d = Q.defer();
//		    var sql = "SELECT key, value FROM " + settings_item;
//		    var stmt = App.Database.user_db.prepare(sql);
//
//		    stmt.all(function (err, rows) {
//
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//
//			rows.forEach(function (item) {
//			    win.info("Set: " + item.key + " - " + item.value);
//			    Settings[settings_item][item.key] = item.value;
//			});
//
//			d.resolve(true);
//		    });
//		    stmt.finalize();
//		    settings_promises.push(d.promise);
//		});
//		return Q.all(settings_promises);
//	    },
//	    search: function (search_string) {
//		search_string = search_string.toLowerCase();
//		var d = Q.defer();
//		var stmt = App.Database.db.prepare("SELECT s.* FROM Songs s, Songslist sl WHERE sl.name MATCH ? AND s.memid = sl.memid UNION SELECT s.* FROM Songs s, Songslist sl WHERE sl.text MATCH ? AND s.memid = sl.memid");
//		stmt.all(search_string, search_string, function (err, rows) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    var loadedSongs = [];
//		    rows.forEach(function (item, i, arr) {
//
//			loadedSongs.push({
//			    name: item.name,
//			    db: item.db,
//			    uaid: item.uaid,
//			    gaid: item.gaid,
//			    usid: item.usid,
//			    gsid: item.gsid,
//			    text: item.text,
//			});
//		    });
//		    d.resolve(loadedSongs);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    saveSetting: function (section, name, value) {
//		var d = Q.defer();
//
//		var sql = "INSERT OR REPLACE INTO " + section + " VALUES (?,?)"
//
//		var stmt = App.Database.user_db.prepare(sql);
//		stmt.run(name, value, function (err) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    d.resolve();
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    loadSongs: function (author) {
//		var d = Q.defer();
//
//		assert.ok(!isNaN(author.get('uaid')));
//		assert.ok(!isNaN(author.get('gaid')));
//
//		var stmt = App.Database.db.prepare("SELECT Songs.* FROM Songs WHERE Songs.uaid LIKE ? AND Songs.gaid LIKE ? ORDER BY Songs.name");
//		stmt.all(author.get('uaid'), author.get('gaid'), function (err, rows) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    var loadedSongs = [];
//		    rows.forEach(function (item, i, arr) {
//			loadedSongs.push({
//			    name: item.name,
//			    db: item.db,
//			    uaid: item.uaid,
//			    gaid: item.gaid,
//			    usid: item.usid,
//			    gsid: item.gsid,
//			    text: item.text,
//			});
//		    });
//		    d.resolve(loadedSongs);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    deleteSong: function (song) {
//		var d = Q.defer();
//
//		assert.ok(song instanceof App.Model.SongService.Elements.Element);
//		assert.ok(!isNaN(song.get('usid')));
//
//		if (song.get('db') == '2') {
//
//		    /* We only delete local authors */
//
//		    var stmt = App.Database.user_db.prepare("DELETE FROM Songs WHERE usid = ?");
//		    stmt.run(song.get('usid'), function (err) {
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//			d.resolve(true);
//		    });
//		    stmt.finalize();
//		} else {
//		    d.resolve(false);
//		}
//		return d.promise;
//	    },
//	    saveSong: function (song) {
//
//		var d = Q.defer();
//
//		assert.ok(song instanceof App.Model.SongService.Elements.Element);
//
//		var that = this;
//		switch (song.get('db')) {
//
//		    case ('1'):
//
//			/* It is a global song, so create a new song in local db */
//
//			var stmt = App.Database.user_db.prepare("INSERT INTO Songs (uaid, name, gaid, gsid, text) VALUES (?,?,?,?,?)");
//			stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), song.get('gsid'), song.get('text'), function (err) {
//
//			    if (err) {
//				log.error(err);
//				throw new Error(err);
//			    }
//
//			    var song_id = this.lastID;
//			    that.getSinger(
//				    song.get('gaid'),
//				    song.get('uaid')
//				    ).then(
//				    function (singer_name) {
//					that.addSongForApprove(
//						song.get('gaid'),
//						song.get('uaid'),
//						song.get('gsid'),
//						song_id,
//						singer_name,
//						song.get('name'),
//						song.get('text')
//						).then(
//						function () {
//						    d.resolve(true);
//						}
//					);
//				    });
//			});
//
//			break;
//		    case ('2'):
//
//			/* It is a local song, update  */
//
//			var stmt = App.Database.user_db.prepare("UPDATE Songs SET uaid = ?, name = ?, gaid = ?, gsid = ?, text = ? WHERE usid = ?");
//			stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), song.get('gsid'), song.get('text'), song.get('usid'), function (err) {
//
//			    if (err) {
//				log.error(err);
//				d.reject(new Error(err));
//			    }
//
//			    that.getSinger(
//				    song.get('gaid'),
//				    song.get('uaid')
//				    ).then(function (singer_name) {
//				that.addSongForApprove(
//					song.get('gaid'),
//					song.get('uaid'),
//					song.get('gsid'),
//					song.get('usid'),
//					singer_name,
//					song.get('name'),
//					song.get('text')
//					).then(
//					function () {
//					    d.resolve(true);
//					}
//				);
//			    });
//			});
//
//			break;
//		    case ('0'):
//
//			/* New song, create */
//
//			var stmt = App.Database.user_db.prepare("INSERT INTO Songs (uaid, name, gaid, gsid, text) VALUES (?,?,?,?,?)");
//			stmt.run(song.get('uaid'), song.get('name'), song.get('gaid'), "0", song.get('text'), function (err) {
//
//			    if (err) {
//				log.error(err);
//				throw new Error(err);
//			    }
//
//			    var song_id = this.lastID;
//			    that.getSinger(
//				    song.get('gaid'),
//				    song.get('uaid')
//				    ).then(
//				    function (singer_name) {
//					that.addSongForApprove(
//						song.get('gaid'),
//						song.get('uaid'),
//						0,
//						song_id,
//						singer_name,
//						song.get('name'),
//						song.get('text')
//						).then(
//						function () {
//						    d.resolve(true);
//						}
//					);
//				    });
//			});
//			break;
//		    default:
//			throw new Error('Unknown song`s DB');
//
//		}
//
//		return d.promise;
//
//	    },
//	    addSongToLastSongs: function (song) {
//
//		var d = Q.defer();
//
//		assert.ok(song instanceof App.Model.SongService.Elements.Element);
//
//		var stmt = App.Database.user_db.prepare("INSERT INTO LastSongs (gsid, usid) VALUES (?,?)");
//		stmt.run(song.get('gsid'), song.get('usid'), function (err) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    d.resolve(true);
//		});
//		stmt.finalize();
//
//		return d.promise;
//	    },
//	    getLastSongs: function () {
//		var d = Q.defer();
//
//		App.Database.user_db.all("SELECT * FROM LastSongs", function (err, rows) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error("Load author failed. Got error: " + err);
//		    }
//
//		    var loadedSongs = [];
//		    var load_promises = [];
//		    var stmt = App.Database.db.prepare("SELECT Songs.* FROM Songs WHERE Songs.gsid LIKE ? AND Songs.usid LIKE ? LIMIT 1");
//		    rows.forEach(function (last_song_item) {
//			var load_promise = Q.defer();
//
//			stmt.get(last_song_item.gsid, last_song_item.usid, function (err, item) {
//			    if (err) {
//				log.error(err);
//				throw new Error(err);
//			    }
//
//			    var song = new App.Model.SongService.Elements.Element();
//			    song.set('name', item.name);
//			    song.set('db', item.db);
//			    song.set('uaid', item.uaid);
//			    song.set('gaid', item.gaid);
//			    song.set('usid', item.usid);
//			    song.set('gsid', item.gsid);
//			    song.set('text', item.text);
//
//			    loadedSongs.push(song);
//			    load_promise.resolve(true);
//			});
//
//			load_promises.push(load_promise.promise);
//		    });
//		    stmt.finalize();
//
//		    Q.all(load_promises).then(function () {
//			d.resolve(loadedSongs);
//		    });
//		});
//
//		return d.promise;
//	    },
//	    removeSongFromLastSongs: function (song) {
//		var d = Q.defer();
//
//		assert.ok(song instanceof App.Model.SongService.Elements.Element);
//
//		var stmt = App.Database.user_db.prepare("DELETE FROM LastSongs WHERE gsid = ? AND usid = ?");
//		stmt.run(song.get('gsid'), song.get('usid'), function (err) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//		    d.resolve(true);
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    removeAllFromLastSongs: function () {
//		var d = Q.defer();
//		App.Database.user_db.run("DELETE FROM LastSongs", [], function (err) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    d.resolve(true);
//		});
//		return d.promise;
//	    },
//	    addSongForApprove: function (gaid, uaid, gsid, usid, singer_name, song_name, song_text) {
//
//		var d = Q.defer();
//
//		assert.ok(!isNaN(gaid));
//		assert.ok(!isNaN(uaid));
//		assert.ok(!isNaN(gsid));
//		assert.ok(!isNaN(usid));
//
//		/* Check is it already exist record with corresponding gaid, uaid, gsid and guid values */
//
//		var stmt = App.Database.user_db.prepare("SELECT id FROM ForApprove WHERE gaid=? AND uaid=? AND gsid=? AND usid=?");
//		stmt.get(gaid, uaid, gsid, usid, function (err, row) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    if (typeof row == "undefined") {
//
//			/* There is no record with that values, will create one */
//
//			var insert_stmt = App.Database.user_db.prepare("INSERT INTO ForApprove (gaid, uaid, gsid, usid, singer_name, song_name, song_text) VALUES (?,?,?,?,?,?,?)");
//			insert_stmt.run(gaid, uaid, gsid, usid, singer_name, song_name, song_text, function (err) {
//
//			    if (err) {
//				log.error(err);
//				throw new Error(err);
//			    }
//			    d.resolve(true);
//			});
//			insert_stmt.finalize();
//
//		    } else if (!isNaN(row.id)) {
//
//			/* There is a record, will update this one */
//
//			var update_stmt = App.Database.user_db.prepare("UPDATE ForApprove SET singer_name=?, song_name=?, song_text=? WHERE id=?");
//			update_stmt.run(singer_name, song_name, song_text, row.id, function (err) {
//
//			    if (err) {
//				log.error(err);
//				throw new Error(err);
//			    }
//			    d.resolve(true);
//			});
//			update_stmt.finalize();
//
//		    } else {
//			throw new Error("Wrong row.id value: " + row.id);
//		    }
//		});
//		stmt.finalize();
//		return d.promise;
//	    },
//	    getSongsForApprove: function () {
//
//		var d = Q.defer();
//
//		App.Database.user_db.all("SELECT * FROM ForApprove", function (err, rows) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error("Load author failed. Got error: " + err);
//		    }
//
//		    var loadedSongs = [];
//		    rows.forEach(function (item) {
//			loadedSongs.push({
//			    id: item.id,
//			    gaid: item.gaid,
//			    uaid: item.uaid,
//			    gsid: item.gsid,
//			    usid: item.usid,
//			    singer_name: item.singer_name,
//			    name: item.song_name,
//			    text: item.song_text
//			});
//		    });
//		    d.resolve(loadedSongs);
//		});
//		return d.promise;
//	    },
//	    removeSongsForApprove: function (ids_array) {
//		var stmt = App.Database.user_db.prepare("DELETE FROM ForApprove WHERE id=?");
//		for (var i = 0; i < ids_array.length; i++) {
//		    stmt.run(ids_array[i]);
//		}
//		stmt.finalize();
//	    },
//	    removeSongForApprove: function (id) {
//
//		assert.ok(!isNaN(id));
//
//		var stmt = App.Database.user_db.prepare("DELETE FROM ForApprove WHERE id=?");
//		stmt.run(id);
//		stmt.finalize();
//	    },
//	    getSinger: function (gaid, uaid) {
//		var d = Q.defer();
//
//		assert.ok(!isNaN(gaid));
//		assert.ok(!isNaN(uaid));
//
//		var stmt = App.Database.db.prepare("SELECT * FROM Authors WHERE gaid = ? AND uaid = ?");
//		stmt.get(gaid, uaid, function (err, row) {
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    d.resolve(row.name);
//		});
//		stmt.finalize();
//
//		return d.promise;
//	    },
//	    loadAuthors: function () {
//
//		var d = Q.defer();
//
//		App.Database.db.all("SELECT * FROM Authors", function (err, rows) {
//
//		    if (err) {
//			log.error(err);
//			throw new Error(err);
//		    }
//
//		    var loadedAuthors = [];
//
//		    rows.forEach(function (item, i, arr) {
//			loadedAuthors.push({
//			    name: item.name,
//			    db: item.db,
//			    uaid: item.uaid,
//			    gaid: item.gaid,
//			});
//
//		    });
//
//		    d.resolve(loadedAuthors);
//
//		});
//
//		return d.promise;
//	    },
//	    deleteAuthor: function (author) {
//
//		var d = Q.defer();
//
//		assert.ok(author instanceof App.Model.Author);
//		assert.ok(!isNaN(author.get('uaid')));
//
//		if (author.get('db') == '2') {
//
//		    /* We only delete local authors */
//
//		    var stmt = App.Database.user_db.prepare("DELETE FROM Authors WHERE uaid = ?");
//		    stmt.run(author.get('uaid'), function (err) {
//			if (err) {
//			    log.error(err);
//			    throw new Error(err);
//			}
//			d.resolve(true);
//		    });
//		    stmt.finalize();
//		}
//
//		return d.promise;
//	    },
//	    saveAuthor: function (author) {
//
//		assert.ok(author instanceof App.Model.Author);
//
//		switch (author.get('db')) {
//
//		    case ('1'):
//
//			/* It is a global author, so create a new author in local db */
//			assert.ok(!isNaN(author.get('gaid')));
//			var stmt = App.Database.user_db.prepare("INSERT INTO Authors (name, gaid) VALUES (?,?)");
//			stmt.run(author.get('name'), author.get('gaid'));
//			stmt.finalize();
//
//			break;
//		    case ('2'):
//
//			/* It is a local author, update  */
//			assert.ok(!isNaN(author.get('uaid')));
//			var stmt = App.Database.user_db.prepare("UPDATE Authors SET name = ? WHERE uaid = ?");
//			stmt.run(author.get('name'), author.get('uaid'));
//			stmt.finalize();
//
//			break;
//		    case ('0'):
//
//			/* New author, create */
//
//			var stmt = App.Database.user_db.prepare("INSERT INTO Authors (name, gaid) VALUES (?,?)");
//			stmt.run(author.get('name'), '0');
//			stmt.finalize();
//
//			break;
//		    default:
//			log.error('Unknown author`s DB');
//			return;
//		}
//	    }
//	}
//    }
});

