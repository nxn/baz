define(["require", "exports", './async'], function(require, exports, __async__) {
    var async = __async__;

    var File = (function () {
        function File(fileData) {
            this.type = fileData.type;
            this.content = fileData.content;
            this.name = fileData.name;
            this.location = fileData.location;
        }
        File._rxRepeatingSlash = /\/{2,}/g;
        File._rxTrailingSlash = /(.+?)(?:\/*)$/;
        File.prototype.addChild = function (file) {
            if(!this.isDirectory) {
                return;
            }
            if(!this.content) {
                this.content = {
                };
            }
            var siblings = this.content;
            siblings[file.name] = {
                name: file.name,
                type: file.type
            };
        };
        File.prototype.removeChild = function (filename) {
            if(!this.isDirectory || !this.content) {
                return;
            }
            var siblings = this.content;
            delete siblings[filename];
        };
        File.prototype.getInfoObject = function () {
            return {
                name: this.name,
                type: this.type,
                location: this.location
            };
        };
        File.prototype.getStoreObject = function () {
            return {
                name: this.name,
                location: this.location,
                type: this.type,
                content: this.content,
                absolutePath: this.absolutePath
            };
        };
        Object.defineProperty(File.prototype, "name", {
            get: function () {
                return this._name;
            },
            set: function (value) {
                value = (value || "").trim();
                if(this.isDirectory) {
                    value = FileUtils.trimTrailingSlashes(value);
                }
                if(value && value.indexOf('/') >= 0) {
                    throw ('FAILURE: Invalid file name: "' + value + '".');
                }
                this._name = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(File.prototype, "location", {
            get: function () {
                return this._location;
            },
            set: function (value) {
                value = FileUtils.normalizePath(value);
                if(value === "") {
                    throw ('FAILURE: Invalid file location (empty). File: "' + this.name + '".');
                }
                this._location = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(File.prototype, "size", {
            get: function () {
                if(this.isDirectory) {
                    return Object.getOwnPropertyNames(this.content).length;
                } else {
                    if(this.content instanceof ArrayBuffer) {
                        (this.content).byteLength;
                    }
                }
                return (this.content).length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(File.prototype, "absolutePath", {
            get: function () {
                return FileUtils.getAbsolutePath(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(File.prototype, "isDirectory", {
            get: function () {
                return FileUtils.isDirectory(this);
            },
            enumerable: true,
            configurable: true
        });
        return File;
    })();    
    var FileUtils;
    (function (FileUtils) {
        var rxDirectory = /^(?:\s*)application\/vnd\.baz\.directory(?:.*)$/;
        var rxRepeatingSlash = /\/{2,}/g;
        var rxTrailingSlash = /(.+?)(?:\/*)$/;
        var rxFilenameAndLocation = /^(\/(?:.*\/)?)(.*)$/;
        function isDirectory(thing) {
            if(typeof thing === "string") {
                return rxDirectory.test(thing);
            }
            if(typeof thing === "object" && (thing).hasOwnProperty("type")) {
                return rxDirectory.test(thing.type);
            }
            return false;
        }
        FileUtils.isDirectory = isDirectory;
        function normalizePath(value) {
            return trimTrailingSlashes((value || "").trim().replace(File._rxRepeatingSlash, '/'));
        }
        FileUtils.normalizePath = normalizePath;
        function trimTrailingSlashes(value) {
            var result = File._rxTrailingSlash.exec((value || "").trim());
            if(result && result[1]) {
                value = result[1];
            }
            return value;
        }
        FileUtils.trimTrailingSlashes = trimTrailingSlashes;
        function getAbsolutePath(fileInfo) {
            return fileInfo.location + fileInfo.name;
        }
        FileUtils.getAbsolutePath = getAbsolutePath;
        function getFilenameAndLocation(absolutePath) {
            absolutePath = normalizePath(absolutePath);
            var results = rxFilenameAndLocation.exec(absolutePath);
            return {
                directory: results[1],
                filename: results[2]
            };
        }
        FileUtils.getFilenameAndLocation = getFilenameAndLocation;
    })(FileUtils || (FileUtils = {}));

    var FileDb = (function () {
        function FileDb(config) {
            this.utils = FileUtils;
            this._name = config.name;
            this._version = config.version || FileDb._CURRENT_DB_VERSION;
            this._env = config.environment || FileDb._DEFAULT_ENV;
        }
        FileDb._OPEN_DBS = {
        };
        FileDb._INDEXEDDB = window.indexedDB;
        FileDb._FILE_STORE = "files";
        FileDb._FILE_STORE_KEY = "absolutePath";
        FileDb._FILE_STORE_NAME_INDEX = "name";
        FileDb._READ_WRITE = "readwrite";
        FileDb._READ_ONLY = "readonly";
        FileDb._VERSION_CHANGE = "versionchange";
        FileDb._CURRENT_DB_VERSION = 1;
        FileDb._DEFAULT_ENV = {
            log: function (any) {
                var args = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    args[_i] = arguments[_i + 1];
                }
            }
        };
        Object.defineProperty(FileDb.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileDb.prototype, "version", {
            get: function () {
                return this._version;
            },
            enumerable: true,
            configurable: true
        });
        FileDb.prototype._getDb = function () {
            var _this = this;
            return async.newTask(function (cb) {
                if(FileDb._OPEN_DBS.hasOwnProperty(_this.name)) {
                    cb(FileDb._OPEN_DBS[_this.name]);
                    return;
                }
                _this._env.log('Opening database "%s", version "%d"...', _this.name, _this.version);
                var request = FileDb._INDEXEDDB.open(_this.name, _this.version);
                request.onsuccess = function (ev) {
                    var result = request.result;
                    _this._env.log('\tOpened database "%s", version "%d".', result.name, result.version);
                    FileDb._OPEN_DBS[_this.name] = result;
                    cb(result);
                };
                request.onerror = function (ev) {
                    _this._env.log("Unhandled error: ", request.error);
                };
                request.onupgradeneeded = function (ev) {
                    var db = request.result;
                    _this._env.log('Upgrade needed for database "%s", version "%d". Current Version: "%d".', db.name, db.version, FileDb._CURRENT_DB_VERSION);
                    switch(db.version) {
                        default: {
                            _this._initDb(db);
                            break;

                        }
                    }
                };
            });
        };
        FileDb.prototype._initDb = function (db) {
            var _this = this;
            this._env.log('Creating object store "%s" in database "%s"...', FileDb._FILE_STORE, db.name);
            var fileStore = db.createObjectStore(FileDb._FILE_STORE, {
                keyPath: FileDb._FILE_STORE_KEY
            });
            fileStore.createIndex(FileDb._FILE_STORE_NAME_INDEX, FileDb._FILE_STORE_NAME_INDEX, {
                unique: false
            });
            var root = {
                name: '',
                location: '/',
                type: 'application/vnd.baz.directory.solution',
                content: {
                }
            };
            fileStore.put(new File(root)).onerror = function (ev) {
                _this._env.log('\tFAILURE: Could not create ROOT in database "%s".', _this.name);
            };
        };
        FileDb.prototype.get = function (absolutePath, cb) {
            var _this = this;
            absolutePath = FileUtils.normalizePath(absolutePath);
            this._env.log('Getting "%s" from database "%s"...', absolutePath, this.name);
            this._getDb().done(function (db) {
                var request = db.transaction(FileDb._FILE_STORE, FileDb._READ_ONLY).objectStore(FileDb._FILE_STORE).get(absolutePath);
                request.onsuccess = function (ev) {
                    _this._env.log('\tSUCCESS: Got "%s" from database "%s".', absolutePath, _this.name);
                    cb({
                        success: true,
                        result: new File(request.result)
                    });
                };
                request.onerror = function (ev) {
                    _this._env.log('\tFAILURE: Could not get "%s" from database "%s".', absolutePath, _this.name);
                    cb({
                        success: false,
                        error: request.error
                    });
                };
            });
        };
        FileDb.prototype.put = function (fileData, cb) {
            var _this = this;
            var file = new File(fileData);
            this._env.log('Saving "%s" to database "%s"...', file.absolutePath, this.name);
            this._getDb().next(function (db) {
                return function (cb) {
                    var transaction = db.transaction(FileDb._FILE_STORE, FileDb._READ_WRITE);
                    transaction.onerror = function (ev) {
                        _this._env.log('\tFAILURE: Could not save "%s" to database "%s".', file.absolutePath, _this.name);
                        cb({
                            success: false,
                            error: (ev.target).error
                        });
                    };
                    transaction.onabort = function (ev) {
                        _this._env.log('\tFAILURE: Transaction aborted while saving "%s" to database "%s".', file.absolutePath, _this.name);
                        cb({
                            success: false,
                            error: (ev.target).error
                        });
                    };
                    transaction.objectStore(FileDb._FILE_STORE).get(file.location).onsuccess = function (ev) {
                        var result = (ev.target).result;
                        if(typeof result === 'undefined') {
                            transaction.abort();
                            return;
                        }
                        cb(result, transaction);
                    };
                }
            }).next(function (parentData, transaction) {
                return function (cb) {
                    var parent = new File(parentData);
                    if(!parent.isDirectory) {
                        transaction.abort();
                        return;
                    }
                    parent.addChild(file);
                    transaction.objectStore(FileDb._FILE_STORE).put(parent.getStoreObject()).onsuccess = function (ev) {
                        return cb(transaction);
                    };
                }
            }).done(function (transaction) {
                transaction.objectStore(FileDb._FILE_STORE).put(file.getStoreObject()).onsuccess = function (ev) {
                    _this._env.log('\tSUCCESS: Saved "%s" to database "%s".', file.absolutePath, _this.name);
                    cb({
                        success: true,
                        result: (ev.target).result
                    });
                };
            });
        };
        FileDb.prototype.del = function (absolutePath, cb) {
            var _this = this;
            absolutePath = FileUtils.normalizePath(absolutePath);
            this._env.log('Removing "%s" from database "%s"...', absolutePath, this.name);
            var pathInfo = FileUtils.getFilenameAndLocation(absolutePath);
            this._getDb().next(function (db) {
                return function (cb) {
                    var transaction = db.transaction(FileDb._FILE_STORE, FileDb._READ_WRITE);
                    transaction.onerror = function (ev) {
                        _this._env.log('\tFAILURE: Could not remove "%s" from database "%s".', absolutePath, _this.name);
                        cb({
                            success: false,
                            error: (ev.target).error
                        });
                    };
                    transaction.onabort = function (ev) {
                        _this._env.log('\tFAILURE: Transaction aborted while deleting "%s" from database "%s".', absolutePath, _this.name);
                        cb({
                            success: false,
                            error: (ev.target).error
                        });
                    };
                    transaction.objectStore(FileDb._FILE_STORE).get(pathInfo.directory).onsuccess = function (ev) {
                        var result = (ev.target).result;
                        if(typeof (result) === 'undefined') {
                            transaction.abort();
                            return;
                        }
                        cb(result, transaction);
                    };
                }
            }).next(function (parentData, transaction) {
                return function (cb) {
                    var parent = new File(parentData);
                    if(!parent.isDirectory) {
                        transaction.abort();
                        return;
                    }
                    parent.removeChild(pathInfo.filename);
                    transaction.objectStore(FileDb._FILE_STORE).put(parent.getStoreObject()).onsuccess = function (ev) {
                        return cb(transaction);
                    };
                }
            }).done(function (transaction) {
                return transaction.objectStore(FileDb._FILE_STORE).delete(absolutePath).onsuccess = function (ev) {
                    _this._env.log('\tSUCCESS: Removed  "%s" from database "%s".', absolutePath, _this.name);
                    cb({
                        success: true,
                        result: (ev.target).result
                    });
                };
            });
        };
        return FileDb;
    })();    
    function open(config) {
        return new FileDb(config);
    }
    exports.open = open;
})

