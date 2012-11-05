define(["require", "exports", './async'], function(require, exports, __async__) {
    var async = __async__;

    var File = (function () {
        function File(fileData) {
            this.name = fileData.name;
            this.location = fileData.location;
            this.type = fileData.type;
            this.content = fileData.content;
            this.children = fileData.children || {
            };
            this.childCount = Object.getOwnPropertyNames(this.children).length;
        }
        File._rxRepeatingSlash = /\/{2,}/g;
        File._rxTrailingSlash = /(.+?)(?:\/*)$/;
        File.prototype.addChild = function (file) {
            this.children[file.name] = {
                name: file.name,
                type: file.type
            };
        };
        File.prototype.removeChild = function (filename) {
            delete this.children[filename];
        };
        File.prototype.forEachChild = function (fn) {
            var names = Object.getOwnPropertyNames(this.children);
            for(var i = 0, child; child = this.children[names[i]]; i++) {
                fn(child);
            }
        };
        File.prototype.getInfoObject = function () {
            return {
                name: this.name,
                type: this.type,
                location: this.location,
                children: this.children
            };
        };
        File.prototype.getStoreObject = function () {
            return {
                name: this.name,
                location: this.location,
                type: this.type,
                content: this.content,
                children: this.children,
                absolutePath: this.absolutePath
            };
        };
        Object.defineProperty(File.prototype, "name", {
            get: function () {
                return this._name;
            },
            set: function (value) {
                value = FileUtils.trimTrailingSlashes((value || "").trim());
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
                var files = Object.getOwnPropertyNames(this.children);
                this.forEachChild(function (c) {
                });
                if(this.content instanceof ArrayBuffer) {
                    return (this.content).byteLength;
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
        return File;
    })();    
    var FileUtils;
    (function (FileUtils) {
        var rxRepeatingSlash = /\/{2,}/g;
        var rxTrailingSlash = /(.+?)(?:\/*)$/;
        var rxFilenameAndLocation = /^(\/(?:.*(?=\/))?)\/?(.*)$/;
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
            return normalizePath(fileInfo.location + '/' + fileInfo.name);
        }
        FileUtils.getAbsolutePath = getAbsolutePath;
        function getPathInfo(absolutePath) {
            absolutePath = normalizePath(absolutePath);
            var results = rxFilenameAndLocation.exec(absolutePath);
            return {
                location: results[1],
                name: results[2]
            };
        }
        FileUtils.getPathInfo = getPathInfo;
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
        FileDb._NOOP = function () {
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
                type: 'application/vnd.baz.root',
                content: null,
                children: null
            };
            fileStore.put(new File(root).getStoreObject()).onerror = function (ev) {
                _this._env.log('\tFAILURE: Could not create ROOT in database "%s".', _this.name);
            };
        };
        FileDb.prototype._openDb = function () {
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
                    _this._env.log('\tSUCCESS: Opened database "%s", version "%d".', result.name, result.version);
                    FileDb._OPEN_DBS[_this.name] = result;
                    cb(result);
                };
                request.onerror = function (ev) {
                    _this._env.log("Unhandled error: ", (ev.target).error);
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
        FileDb.prototype._getTransaction = function (config, cb) {
            var _this = this;
            return this._openDb().next(function (db) {
                var transaction = db.transaction(FileDb._FILE_STORE, config.mode || FileDb._READ_ONLY);
                transaction.onerror = function (ev) {
                    _this._env.log(config.errorMsg);
                    cb({
                        success: false,
                        error: (ev.target).error
                    });
                };
                transaction.onabort = function (ev) {
                    _this._env.log(config.abortMsg);
                    cb({
                        success: false,
                        error: (ev.target).error
                    });
                };
                transaction.oncomplete = function (ev) {
                    _this._env.log(config.successMsg);
                    cb({
                        success: true,
                        result: (ev.target).result
                    });
                };
                return function (cb) {
                    return cb(transaction);
                }
            });
        };
        FileDb.prototype._addChildReferenceFor = function (file, transaction) {
            var _this = this;
            async.newTask(function (cb) {
                return transaction.objectStore(FileDb._FILE_STORE).get(file.location).onsuccess = function (ev) {
                    var result = (ev.target).result;
                    if(typeof result === 'undefined') {
                        (ev.target).transaction.abort();
                        return;
                    }
                    cb(result);
                };
            }).next(function (parentData) {
                var parent = new File(parentData);
                parent.addChild(file);
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_STORE).put(parent.getStoreObject()).onsuccess = cb;
                }
            }).done(function () {
                return _this._env.log('\t\tSUCCESS: Added reference "%s" to parent "%s".', file.name, file.location);
            });
        };
        FileDb.prototype._removeChildReferenceFor = function (absolutePath, transaction) {
            var _this = this;
            var pathInfo = FileUtils.getPathInfo(absolutePath);
            async.newTask(function (cb) {
                return transaction.objectStore(FileDb._FILE_STORE).get(pathInfo.location).onsuccess = function (ev) {
                    var result = (ev.target).result;
                    if(typeof (result) === 'undefined') {
                        (ev.target).transaction.abort();
                        return;
                    }
                    cb(result);
                };
            }).next(function (parentData) {
                var parent = new File(parentData);
                parent.removeChild(pathInfo.name);
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_STORE).put(parent.getStoreObject()).onsuccess = cb;
                }
            }).done(function () {
                return _this._env.log('\t\tSUCCESS: Removed reference "%s" from parent "%s".', pathInfo.name, pathInfo.location);
            });
        };
        FileDb.prototype._traverseWithAction = function (root, action, transaction) {
            var _this = this;
            root.forEachChild(function (c) {
                return transaction.objectStore(FileDb._FILE_STORE).get(FileUtils.getAbsolutePath({
                    name: c.name,
                    location: root.absolutePath
                })).onsuccess = (function (ev) {
                    var result = (ev.target).result;
                    if(result) {
                        _this._traverseWithAction(new File(result), action, transaction);
                    }
                });
            });
            action(root);
        };
        FileDb.prototype.read = function (absolutePath, cb) {
            var _this = this;
            absolutePath = FileUtils.normalizePath(absolutePath);
            this._env.log('Getting "%s" from database "%s"...', absolutePath, this.name);
            this._openDb().done(function (db) {
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
        FileDb.prototype.save = function (fileData, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            var file = new File(fileData);
            this._env.log('Saving "%s" to database "%s"...', file.absolutePath, this.name);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                successMsg: [
                    '\tSUCCESS: Transaction for saving "', 
                    file.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while saving "', 
                    file.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '".'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not save "', 
                    file.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).done(function (transaction) {
                _this._addChildReferenceFor(file, transaction);
                async.newTask(function (cb) {
                    return transaction.objectStore(FileDb._FILE_STORE).put(file.getStoreObject()).onsuccess = cb;
                }).done(function () {
                    return _this._env.log('\t\tSUCCESS: Saved "%s" to database "%s".', file.absolutePath, _this.name);
                });
            });
        };
        FileDb.prototype.remove = function (absolutePath, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            absolutePath = FileUtils.normalizePath(absolutePath);
            this._env.log('Removing "%s" from database "%s"...', absolutePath, this.name);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                successMsg: [
                    '\tSUCCESS: Transaction for removal of "', 
                    absolutePath, 
                    '" from database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not remove "', 
                    absolutePath, 
                    '" from database "', 
                    this.name, 
                    '".'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while deleting "', 
                    absolutePath, 
                    '" from database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).done(function (transaction) {
                _this._removeChildReferenceFor(absolutePath, transaction);
                async.newTask(function (cb) {
                    return transaction.objectStore(FileDb._FILE_STORE).get(absolutePath).onsuccess = function (ev) {
                        var result = (ev.target).result;
                        if(typeof (result) === 'undefined') {
                            (ev.target).transaction.abort();
                            return;
                        }
                        cb(result);
                    };
                }).next(function (itemData) {
                    var item = new File(itemData);
                    return function (cb) {
                        return _this._traverseWithAction(item, function (child) {
                            transaction.objectStore(FileDb._FILE_STORE).delete(child.absolutePath).onsuccess = function (ev) {
                                return cb(child);
                            };
                        }, transaction);
                    }
                }).done(function (child) {
                    return _this._env.log('\t\tSUCCESS: Removing item "%s" from database "%s".', child.absolutePath, _this.name);
                });
            });
        };
        FileDb.prototype.copy = function (fromPath, toPath, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            fromPath = FileUtils.normalizePath(fromPath);
            toPath = FileUtils.normalizePath(toPath);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                successMsg: [
                    '\tSUCCESS: Transaction for copying "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not copy "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while copying "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).done(function (transaction) {
                async.newTask(function (cb) {
                    transaction.objectStore(FileDb._FILE_STORE).get(fromPath).onsuccess = function (ev) {
                        var result = (ev.target).result;
                        if(typeof (result) === 'undefined') {
                            (ev.target).transaction.abort();
                            return;
                        }
                        cb(result);
                    };
                }).done(function (fileData) {
                    var root = new File(fileData);
                    _this._traverseWithAction(root, function (file) {
                        var isRoot = file.absolutePath === root.absolutePath;
                        var oldFilePath = file.absolutePath;
                        var newPathInfo = null;

                        if(isRoot) {
                            newPathInfo = FileUtils.getPathInfo(toPath);
                        } else {
                            newPathInfo = FileUtils.getPathInfo(oldFilePath.replace(fromPath, toPath));
                        }
                        file.name = newPathInfo.name;
                        file.location = newPathInfo.location;
                        if(isRoot) {
                            _this._addChildReferenceFor(file, transaction);
                        }
                        transaction.objectStore(FileDb._FILE_STORE).put(file.getStoreObject()).onsuccess = function (ev) {
                            _this._env.log('\t\tSUCCESS: Copied "%s" to "%s".', oldFilePath, file.absolutePath);
                        };
                    }, transaction);
                });
            });
        };
        FileDb.prototype.move = function (fromPath, toPath, cb) {
            if(!cb) {
                cb = FileDb._NOOP;
            }
            fromPath = FileUtils.normalizePath(fromPath);
            toPath = FileUtils.normalizePath(toPath);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                successMsg: [
                    '\tSUCCESS: Transaction for moving "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not move "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while moving "', 
                    fromPath, 
                    '" to "', 
                    toPath, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).done(function (transaction) {
            });
        };
        return FileDb;
    })();    
    function open(config) {
        return new FileDb(config);
    }
    exports.open = open;
})

