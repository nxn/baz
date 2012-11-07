define(["require", "exports", './async', './guid'], function(require, exports, __async__, __g__) {
    var async = __async__;

    var g = __g__;

    var FileNode = (function () {
        function FileNode(fileNodeData) {
            this.name = fileNodeData.name;
            this.location = fileNodeData.location;
            this.type = fileNodeData.type;
            this.children = fileNodeData.children || {
            };
            this.contentId = fileNodeData.contentId ? new g.Guid(fileNodeData.contentId) : g.Guid.generate();
            this.childCount = Object.getOwnPropertyNames(this.children).length;
        }
        FileNode._rxRepeatingSlash = /\/{2,}/g;
        FileNode._rxTrailingSlash = /(.+?)(?:\/*)$/;
        FileNode.prototype.addChild = function (child) {
            this.children[child.name] = {
                name: child.name,
                type: child.type
            };
        };
        FileNode.prototype.removeChild = function (filename) {
            delete this.children[filename];
        };
        FileNode.prototype.forEachChild = function (fn) {
            var names = Object.getOwnPropertyNames(this.children);
            for(var i = 0, child; child = this.children[names[i]]; i++) {
                fn(child);
            }
        };
        FileNode.prototype.getFileNodeData = function () {
            return {
                name: this.name,
                location: this.location,
                type: this.type,
                children: this.children,
                absolutePath: this.absolutePath,
                contentId: this.contentId.value
            };
        };
        FileNode.prototype.getChildNodeData = function () {
            return {
                name: this.name,
                type: this.type
            };
        };
        Object.defineProperty(FileNode.prototype, "name", {
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
        Object.defineProperty(FileNode.prototype, "location", {
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
        Object.defineProperty(FileNode.prototype, "size", {
            get: function () {
                var files = Object.getOwnPropertyNames(this.children);
                this.forEachChild(function (c) {
                });
                return -1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileNode.prototype, "absolutePath", {
            get: function () {
                return FileUtils.getAbsolutePath(this);
            },
            enumerable: true,
            configurable: true
        });
        return FileNode;
    })();    
    var FileUtils;
    (function (FileUtils) {
        var rxRepeatingSlash = /\/{2,}/g;
        var rxTrailingSlash = /(.+?)(?:\/*)$/;
        var rxFilenameAndLocation = /^(\/(?:.*(?=\/))?)\/?(.*)$/;
        function normalizePath(value) {
            return trimTrailingSlashes((value || "").trim().replace(FileNode._rxRepeatingSlash, '/'));
        }
        FileUtils.normalizePath = normalizePath;
        function trimTrailingSlashes(value) {
            var result = FileNode._rxTrailingSlash.exec((value || "").trim());
            if(result && result[1]) {
                value = result[1];
            }
            return value;
        }
        FileUtils.trimTrailingSlashes = trimTrailingSlashes;
        function getAbsolutePath(pathInfo) {
            return normalizePath(pathInfo.location + '/' + pathInfo.name);
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
        FileDb._FILE_NODE_STORE = "file-nodes";
        FileDb._FILE_CONTENT_STORE = "file-contents";
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
        FileDb.prototype._openDb = function () {
            var _this = this;
            return async.newTask(function (cb) {
                if(FileDb._OPEN_DBS.hasOwnProperty(_this.name)) {
                    cb(FileDb._OPEN_DBS[_this.name]);
                    return;
                }
                _this._env.log('INFO: Opening database "%s", version "%d"...', _this.name, _this.version);
                var request = FileDb._INDEXEDDB.open(_this.name, _this.version);
                request.onsuccess = function (ev) {
                    var result = request.result;
                    _this._env.log('\tSUCCESS: Opened database "%s", version "%d".', result.name, result.version);
                    FileDb._OPEN_DBS[_this.name] = result;
                    cb(result);
                };
                request.onerror = function (ev) {
                    _this._env.log("\tFAILURE:", (ev.target).error);
                };
                request.onupgradeneeded = function (ev) {
                    var db = request.result;
                    _this._env.log('INFO: Upgrade needed for database "%s", version "%d". Current Version: "%d".', db.name, db.version, FileDb._CURRENT_DB_VERSION);
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
            this._env.log('INFO: Creating object store "%s" in database "%s"...', FileDb._FILE_CONTENT_STORE, db.name);
            var fileContentStore = db.createObjectStore(FileDb._FILE_CONTENT_STORE);
            this._env.log('INFO: Creating object store "%s" in database "%s"...', FileDb._FILE_NODE_STORE, db.name);
            var fileNodeStore = db.createObjectStore(FileDb._FILE_NODE_STORE);
            fileNodeStore.createIndex(FileDb._FILE_STORE_NAME_INDEX, FileDb._FILE_STORE_NAME_INDEX, {
                unique: false
            });
            var rootNode = new FileNode({
                name: '',
                location: '/',
                type: 'application/vnd.baz.root',
                children: null,
                contentId: null
            });
            fileNodeStore.put(rootNode.getFileNodeData(), rootNode.absolutePath).onerror = function (ev) {
                _this._env.log('\tFAILURE: Could not create ROOT in database "%s".', _this.name);
            };
        };
        FileDb.prototype._getTransaction = function (config, cb) {
            var _this = this;
            return this._openDb().next(function (db) {
                var stores = config.stores;
                if(!stores || config.stores.length < 1) {
                    stores = [
                        FileDb._FILE_NODE_STORE
                    ];
                }
                var transaction = db.transaction(stores, config.mode || FileDb._READ_ONLY);
                _this._env.log(config.initMsg);
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
                return transaction.objectStore(FileDb._FILE_NODE_STORE).get(file.location).onsuccess = function (ev) {
                    var result = (ev.target).result;
                    if(typeof result === 'undefined') {
                        (ev.target).transaction.abort();
                    } else {
                        cb(result);
                    }
                };
            }).next(function (parentNodeData) {
                var parentNode = new FileNode(parentNodeData);
                parentNode.addChild(file.getChildNodeData());
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_NODE_STORE).put(parentNode.getFileNodeData(), parentNode.absolutePath).onsuccess = cb;
                }
            }).done(function () {
                return _this._env.log('\tSUCCESS: Added reference "%s" to parent "%s".', file.name, file.location);
            });
        };
        FileDb.prototype._removeChildReferenceFor = function (absolutePath, transaction) {
            var _this = this;
            var pathInfo = FileUtils.getPathInfo(absolutePath);
            async.newTask(function (cb) {
                return transaction.objectStore(FileDb._FILE_NODE_STORE).get(pathInfo.location).onsuccess = function (ev) {
                    var result = (ev.target).result;
                    if(typeof (result) === 'undefined') {
                        (ev.target).transaction.abort();
                    } else {
                        cb(result);
                    }
                };
            }).next(function (parentNodeData) {
                var parentNode = new FileNode(parentNodeData);
                parentNode.removeChild(pathInfo.name);
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_NODE_STORE).put(parentNode.getFileNodeData(), parentNode.absolutePath).onsuccess = cb;
                }
            }).done(function () {
                return _this._env.log('\tSUCCESS: Removed reference "%s" from parent "%s".', pathInfo.name, pathInfo.location);
            });
        };
        FileDb.prototype._traverseWithAction = function (transaction, root, action) {
            var _this = this;
            root.forEachChild(function (c) {
                return transaction.objectStore(FileDb._FILE_NODE_STORE).get(FileUtils.getAbsolutePath({
                    name: c.name,
                    location: root.absolutePath
                })).onsuccess = (function (ev) {
                    var result = (ev.target).result;
                    if(result) {
                        _this._traverseWithAction(transaction, new FileNode(result), action);
                    }
                });
            });
            action(root);
        };
        FileDb.prototype._cpFileBranch = function (source, destination, transaction, detachContent) {
            if (typeof detachContent === "undefined") { detachContent = false; }
            var _this = this;
            return function (cb) {
                return transaction.objectStore(FileDb._FILE_NODE_STORE).get(source).onsuccess = function (ev) {
                    var fileNodeData = (ev.target).result;
                    if(typeof (fileNodeData) === 'undefined') {
                        (ev.target).transaction.abort();
                        return;
                    }
                    var root = new FileNode(fileNodeData);
                    _this._traverseWithAction(transaction, root, function (fileNode) {
                        var isRoot = fileNode.absolutePath === root.absolutePath;
                        var oldFilePath = fileNode.absolutePath;
                        var newPathInfo = null;

                        if(isRoot) {
                            newPathInfo = FileUtils.getPathInfo(destination);
                        } else {
                            newPathInfo = FileUtils.getPathInfo(oldFilePath.replace(source, destination));
                        }
                        fileNode.name = newPathInfo.name;
                        fileNode.location = newPathInfo.location;
                        if(detachContent) {
                            fileNode.contentId = g.Guid.generate();
                        }
                        if(isRoot) {
                            _this._addChildReferenceFor(fileNode, transaction);
                        }
                        transaction.objectStore(FileDb._FILE_NODE_STORE).add(fileNode.getFileNodeData(), fileNode.absolutePath).onsuccess = function (ev) {
                            return cb(oldFilePath, fileNode.absolutePath, transaction);
                        };
                    });
                };
            }
        };
        FileDb.prototype._resolveContentId = function (absolutePath, transaction) {
            return function (cb) {
                return transaction.objectStore(FileDb._FILE_NODE_STORE).get(absolutePath).onsuccess = function (ev) {
                    var fileNodeData = (ev.target).result;
                    cb(fileNodeData.contentId, transaction);
                };
            }
        };
        FileDb.prototype.getFileNode = function (absolutePath, cb) {
            var _this = this;
            if(!cb) {
                return;
            }
            absolutePath = FileUtils.normalizePath(absolutePath);
            this._env.log('INFO: Getting "%s" from database "%s"...', absolutePath, this.name);
            this._openDb().done(function (db) {
                var request = db.transaction(FileDb._FILE_NODE_STORE, FileDb._READ_ONLY).objectStore(FileDb._FILE_NODE_STORE).get(absolutePath);
                request.onsuccess = function (ev) {
                    if(typeof (request.result) === 'undefined') {
                        _this._env.log('\tERROR: No file found at path "%s" in database "%s".', absolutePath, _this.name);
                        cb({
                            success: false,
                            error: [
                                'No file found at path "', 
                                absolutePath, 
                                '" in database "', 
                                _this.name, 
                                '".'
                            ].join('')
                        });
                    } else {
                        _this._env.log('\tSUCCESS: Got "%s" from database "%s".', absolutePath, _this.name);
                        cb({
                            success: true,
                            result: new FileNode(request.result)
                        });
                    }
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
        FileDb.prototype.getFileContent = function (identifier, cb) {
            var _this = this;
            if(!cb) {
                return;
            }
            var task;
            var transactionConfig = {
                mode: FileDb._READ_ONLY,
                initMsg: [
                    'INFO: Starting transaction to get file contents of "', 
                    identifier, 
                    '" from database "', 
                    this.name, 
                    '"...'
                ].join(''),
                successMsg: [
                    '\tSUCCESS: Transaction for getting file contents of "', 
                    identifier, 
                    '" from database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while getting file contents of "', 
                    identifier, 
                    '" from database "', 
                    this.name, 
                    '".'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not get "', 
                    identifier, 
                    '" from database "', 
                    this.name, 
                    '".'
                ].join('')
            };

            if(typeof identifier === 'string') {
                transactionConfig.stores = [
                    FileDb._FILE_NODE_STORE, 
                    FileDb._FILE_CONTENT_STORE
                ];
                identifier = FileUtils.normalizePath(identifier);
                task = this._getTransaction(transactionConfig, cb).next(function (transaction) {
                    return _this._resolveContentId(identifier, transaction);
                });
            } else {
                if(identifier instanceof g.Guid) {
                    transactionConfig.stores = [
                        FileDb._FILE_CONTENT_STORE
                    ];
                    task = this._getTransaction(transactionConfig, cb).next(function (transaction) {
                        return function (cb) {
                            return cb((identifier).value, transaction);
                        }
                    });
                } else {
                    cb({
                        success: false,
                        error: [
                            'Cannot not resolve file content with identifier "', 
                            identifier, 
                            '".'
                        ].join('')
                    });
                    return;
                }
            }
            task.done(function (contentId, transaction) {
                if(contentId) {
                    transaction.objectStore(FileDb._FILE_CONTENT_STORE).get(contentId);
                } else {
                    _this._env.log('\tWARNING: Cannot resolve file content with identifier "%s" (contentId: "%s").', identifier, contentId);
                }
            });
        };
        FileDb.prototype.putFileNode = function (fileNodeData, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            var fileNode = new FileNode(fileNodeData);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                initMsg: [
                    'INFO: Starting transaction to save "', 
                    fileNode.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '"...'
                ].join(''),
                successMsg: [
                    '\tSUCCESS: Transaction for saving "', 
                    fileNode.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while saving "', 
                    fileNode.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '".'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not save "', 
                    fileNode.absolutePath, 
                    '" to database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).next(function (transaction) {
                _this._addChildReferenceFor(fileNode, transaction);
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_NODE_STORE).put(fileNode.getFileNodeData(), fileNode.absolutePath).onsuccess = cb;
                }
            }).done(function () {
                return _this._env.log('\tSUCCESS: Saved "%s" to database "%s".', fileNode.absolutePath, _this.name);
            });
        };
        FileDb.prototype.putFileContent = function (identifier, data, cb) {
        };
        FileDb.prototype.rm = function (absolutePath, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            absolutePath = FileUtils.normalizePath(absolutePath);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                stores: [
                    FileDb._FILE_NODE_STORE, 
                    FileDb._FILE_CONTENT_STORE
                ],
                initMsg: [
                    'INFO: Starting transaction to remove "', 
                    absolutePath, 
                    '" from database "', 
                    this.name, 
                    '"...'
                ].join(''),
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
            this._getTransaction(transactionConfig, cb).next(function (transaction) {
                _this._removeChildReferenceFor(absolutePath, transaction);
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_NODE_STORE).get(absolutePath).onsuccess = function (ev) {
                        var result = (ev.target).result;
                        if(typeof (result) === 'undefined') {
                            (ev.target).transaction.abort();
                        } else {
                            cb(new FileNode(result), transaction);
                        }
                    };
                }
            }).next(function (root, transaction) {
                return function (cb) {
                    return _this._traverseWithAction(transaction, root, function (fileNode) {
                        return transaction.objectStore(FileDb._FILE_NODE_STORE).delete(fileNode.absolutePath).onsuccess = function (ev) {
                            return cb(fileNode, transaction);
                        };
                    });
                }
            }).next(function (fileNode, transaction) {
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_CONTENT_STORE).delete(fileNode.contentId.value).onsuccess = function (ev) {
                        return cb(fileNode);
                    };
                }
            }).done(function (fileNode) {
                return _this._env.log('\tSUCCESS: Removing item "%s" from database "%s".', fileNode.absolutePath, _this.name);
            });
        };
        FileDb.prototype.cp = function (source, destination, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            source = FileUtils.normalizePath(source);
            destination = FileUtils.normalizePath(destination);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                initMsg: [
                    'INFO: Starting transaction to copy "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '"...'
                ].join(''),
                successMsg: [
                    '\tSUCCESS: Transaction for copying "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not copy "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while copying "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).next(function (transaction) {
                return _this._cpFileBranch(source, destination, transaction, true);
            }).done(function (source, destination, transaction) {
                return _this._env.log('\tSUCCESS: Copied "%s" to "%s".', source, destination);
            });
        };
        FileDb.prototype.mv = function (source, destination, cb) {
            var _this = this;
            if(!cb) {
                cb = FileDb._NOOP;
            }
            source = FileUtils.normalizePath(source);
            destination = FileUtils.normalizePath(destination);
            var transactionConfig = {
                mode: FileDb._READ_WRITE,
                initMsg: [
                    'INFO: Starting transaction to move "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '"...'
                ].join(''),
                successMsg: [
                    '\tSUCCESS: Transaction for moving "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '" completed.'
                ].join(''),
                errorMsg: [
                    '\tFAILURE: Could not move "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join(''),
                abortMsg: [
                    '\tFAILURE: Transaction aborted while moving "', 
                    source, 
                    '" to "', 
                    destination, 
                    '" in database "', 
                    this.name, 
                    '".'
                ].join('')
            };
            this._getTransaction(transactionConfig, cb).next(function (transaction) {
                _this._removeChildReferenceFor(source, transaction);
                return _this._cpFileBranch(source, destination, transaction);
            }).next(function (source, destination, transaction) {
                return function (cb) {
                    return transaction.objectStore(FileDb._FILE_NODE_STORE).delete(source).onsuccess = function (ev) {
                        return cb(source, destination);
                    };
                }
            }).done(function (source, destination) {
                return _this._env.log('\tSUCCESS: Moved "%s" to "%s".', source, destination);
            });
        };
        return FileDb;
    })();    
    function open(config) {
        return new FileDb(config);
    }
    exports.open = open;
})

