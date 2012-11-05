/// <reference path="filedb.d.ts" />

import async = module('./async');

class File implements IFile {
    private static _rxRepeatingSlash = /\/{2,}/g;
    private static _rxTrailingSlash = /(.+?)(?:\/*)$/;

    private _name       : string;
    private _location   : string;

    type        : string;
    content     : any;
    children    : IChildInfoDictionary;
    childCount  : number;

    constructor(fileData : IFileData) {
        this.name       = fileData.name;
        this.location   = fileData.location;
        this.type       = fileData.type;
        this.content    = fileData.content;
        this.children   = fileData.children || { };

        this.childCount = Object.getOwnPropertyNames(this.children).length;
    }

    addChild(file : IChildInfo) {
        this.children[file.name] = { name : file.name, type : file.type };
    }

    removeChild(filename) {
        delete this.children[filename];
    }

    forEachChild(fn : (child : IChildInfo) => any) : void {
        var names = Object.getOwnPropertyNames(this.children);

        for (var i = 0, child; child = this.children[names[i]]; i++) {
            fn(child);
        }
    }

    getInfoObject() : IFileInfo {
        return {
            name        : this.name,
            type        : this.type,
            location    : this.location,
            children    : this.children
        }
    }

    getStoreObject() : IFileStoreObject{
        return {
            name            : this.name,
            location        : this.location,
            type            : this.type,
            content         : this.content,
            children        : this.children,
            absolutePath    : this.absolutePath
        };
    }

    get name() {
        return this._name;
    }

    set name(value : string) {
        value = FileUtils.trimTrailingSlashes((value || "").trim())

        // any remaining slashes should throw exception
        if (value && value.indexOf('/') >= 0) {
            throw ('FAILURE: Invalid file name: "' + value + '".');
        }

        this._name = value;
    }

    get location() {
        return this._location
    }

    set location(value) {
        value = FileUtils.normalizePath(value);

        if (value === "") {
            throw ('FAILURE: Invalid file location (empty). File: "' + this.name + '".');
        }

        this._location = value;
    }

    get size() {
        var files = Object.getOwnPropertyNames(this.children);
        this.forEachChild(c => {
            // TODO: recursively sum sizes
        });

        if (this.content instanceof ArrayBuffer) {
            return (<ArrayBuffer> this.content).byteLength;
        }

        return (<string> this.content).length;
    }

    get absolutePath() {
        return FileUtils.getAbsolutePath(this);
    }
}

module FileUtils {
    var rxRepeatingSlash        = /\/{2,}/g;
    var rxTrailingSlash         = /(.+?)(?:\/*)$/;
    var rxFilenameAndLocation   = /^(\/(?:.*(?=\/))?)\/?(.*)$/

    export function normalizePath(value : string) {
        return trimTrailingSlashes(
            (value || "").trim().replace(File._rxRepeatingSlash, '/')
        );
    }

    export function trimTrailingSlashes(value : string) {
        var result = File._rxTrailingSlash.exec((value || "").trim());
        if (result && result[1]) {
            value = result[1];
        }
        return value;
    }

    export function getAbsolutePath(fileInfo : IPathInfo) {
        return normalizePath(fileInfo.location + '/' + fileInfo.name);
    }

    export function getPathInfo(absolutePath : string) {
        absolutePath = normalizePath(absolutePath);
        var results = rxFilenameAndLocation.exec(absolutePath);
        return {
            location    : results[1],
            name        : results[2]
        }
    }
}

interface ITransactionConfig {
    mode?       : string;
    errorMsg    : string;
    abortMsg    : string;
    successMsg  : string;
}

class FileDb implements IFileDb {
    private static _OPEN_DBS                    : { [dbName : string] : IDBDatabase; } = { };
    private static _NOOP                        = () => {};
    private static _INDEXEDDB                   = window.indexedDB;
    private static _FILE_STORE                  = "files";
    private static _FILE_STORE_KEY              = "absolutePath";
    private static _FILE_STORE_NAME_INDEX       = "name";
    private static _READ_WRITE                  = "readwrite";
    private static _READ_ONLY                   = "readonly";
    private static _VERSION_CHANGE              = "versionchange";
    private static _CURRENT_DB_VERSION          = 1;
    private static _DEFAULT_ENV : IEnvironment  = { log: function(any, ...args : any[]) { } }

    private _name       : string;
    private _version    : number;
    private _env        : IEnvironment;

    public get name()       { return this._name; }
    public get version()    { return this._version; }

    public utils : IFileUtils = FileUtils;

    constructor(config : IFileDbConfig)
    {
        this._name      = config.name;
        this._version   = config.version        || FileDb._CURRENT_DB_VERSION;
        this._env       = config.environment    || FileDb._DEFAULT_ENV;
    }

    private _initDb(db : IDBDatabase) {
        this._env.log(
            'Creating object store "%s" in database "%s"...', 
            FileDb._FILE_STORE, 
            db.name
        );

        var fileStore = db.createObjectStore(
            FileDb._FILE_STORE, 
            { keyPath: FileDb._FILE_STORE_KEY }
        );

        fileStore.createIndex(
            FileDb._FILE_STORE_NAME_INDEX, 
            FileDb._FILE_STORE_NAME_INDEX, 
            { unique: false }
        );

        var root : IFileData = {
            name        : '',
            location    : '/',
            type        : 'application/vnd.baz.root',
            content     : null,
            children    : null
        }

        fileStore.put(new File(root).getStoreObject())
            .onerror = (ev) => {
                this._env.log('\tFAILURE: Could not create ROOT in database "%s".', this.name)
            };
    }

    private _openDb() {
        return async.newTask(cb => {
            if (FileDb._OPEN_DBS.hasOwnProperty(this.name)) {
                cb(FileDb._OPEN_DBS[this.name]);
                return;
            }

            this._env.log('Opening database "%s", version "%d"...', this.name, this.version);
            var request = FileDb._INDEXEDDB.open(this.name, this.version);

            request.onsuccess = (ev) => {
                var result : IDBDatabase = request.result;

                this._env.log('\tSUCCESS: Opened database "%s", version "%d".', result.name, result.version);
                FileDb._OPEN_DBS[this.name] = result;
                cb(result);
            }

            request.onerror = (ev) => {
                this._env.log("Unhandled error: ", (<any> ev.target).error);
            }

            request.onupgradeneeded = (ev) => {
                var db = <IDBDatabase> request.result;
                this._env.log(
                    'Upgrade needed for database "%s", version "%d". Current Version: "%d".',
                    db.name,
                    db.version,
                    FileDb._CURRENT_DB_VERSION
                );

                switch(db.version) {
                    default: 
                        this._initDb(db);
                        break;
                }
            }
        });
    }

    private _getTransaction(config : ITransactionConfig, cb : (IResponse) => any) {
        return this._openDb().next((db : IDBDatabase) => {
            var transaction = db.transaction(FileDb._FILE_STORE, config.mode || FileDb._READ_ONLY);

            transaction.onerror = (ev) => {
                this._env.log(config.errorMsg);
                cb({ success: false, error: (<any> ev.target).error });
            }

            transaction.onabort = (ev) => {
                this._env.log(config.abortMsg);
                cb({ success: false, error: (<any> ev.target).error });
            }

            transaction.oncomplete = (ev) => {
                this._env.log(config.successMsg);
                cb({ success: true, result: (<any> ev.target).result });
            }

            return cb => cb(transaction);
        });
    }

    private _addChildReferenceFor(file : IFile, transaction : IDBTransaction) {
        async.newTask(cb =>
            transaction
                .objectStore(FileDb._FILE_STORE)
                .get(file.location)
                .onsuccess = (ev) => {
                    var result = (<any> ev.target).result;

                    if (typeof result === 'undefined') {
                        (<any> ev.target).transaction.abort();
                    }
                    else cb(result);
                }
        ).next((parentData : IFileData) => {
            var parent = new File(parentData);
            parent.addChild(file);

            return cb => transaction
                .objectStore(FileDb._FILE_STORE)
                .put(parent.getStoreObject())
                .onsuccess = cb;
        }).done(() =>
            this._env.log(
                '\t\tSUCCESS: Added reference "%s" to parent "%s".',
                file.name,
                file.location
            )
        );
    }

    private _removeChildReferenceFor(absolutePath : string, transaction : IDBTransaction) {
        var pathInfo = FileUtils.getPathInfo(absolutePath);

        async.newTask(cb => 
            transaction
                .objectStore(FileDb._FILE_STORE)
                .get(pathInfo.location)
                .onsuccess = (ev) => {
                    var result = (<any> ev.target).result;

                    if (typeof(result) === 'undefined') {
                        (<any> ev.target).transaction.abort();
                    } 
                    else cb(result);
                }
        ).next((parentData : IFileData) => {
            var parent = new File(parentData);

            parent.removeChild(pathInfo.name);

            return cb => transaction
                .objectStore(FileDb._FILE_STORE)
                .put(parent.getStoreObject())
                .onsuccess = cb;
            }
        ).done(() =>
            this._env.log(
                '\t\tSUCCESS: Removed reference "%s" from parent "%s".',
                pathInfo.name,
                pathInfo.location
            )
        );
    }

    private _traverseWithAction(
        transaction : IDBTransaction,
        root        : IFile, 
        action      : (file : IFile) => void
    ) {
        root.forEachChild(c => 
            transaction
                .objectStore(FileDb._FILE_STORE)
                .get(
                    FileUtils.getAbsolutePath({ 
                        name    : c.name, 
                        location: root.absolutePath
                    })
                ).onsuccess = (ev => {
                    var result : IFileData = (<any> ev.target).result;

                    if (result) {
                        this._traverseWithAction(transaction, new File(result), action);
                    }
                })
        );

        action(root);
    }

    private _copy(
        source      : string, 
        destination : string, 
        transaction : IDBTransaction
    ) : ITask {
        return async.newTask(cb => {
            transaction
                .objectStore(FileDb._FILE_STORE)
                .get(source)
                .onsuccess = (ev) => {
                    var result = (<any> ev.target).result;

                    if (typeof(result) === 'undefined') {
                        (<any> ev.target).transaction.abort();
                        return;
                    }

                    cb(result);
                }
        }).next((fileData : IFileData) => {
            // Traverse the file and its children updating, saving them to their new destinations
            var root = new File(fileData);

            return cb => this._traverseWithAction(transaction, root, (file : IFile) => {
                var isRoot = file.absolutePath === root.absolutePath
                    , oldFilePath = file.absolutePath
                    , newPathInfo = null;

                if (isRoot) {
                    newPathInfo = FileUtils.getPathInfo(destination);
                }
                else {
                    newPathInfo = FileUtils.getPathInfo(oldFilePath.replace(source, destination));
                }

                file.name      = newPathInfo.name;
                file.location  = newPathInfo.location;

                if (isRoot) {
                    this._addChildReferenceFor(file, transaction);
                }

                transaction
                    .objectStore(FileDb._FILE_STORE)
                    .add(file.getStoreObject()) // use add to prevent overwriting a node
                    .onsuccess = ev => cb(oldFilePath, file.absolutePath, transaction)
            });
        });
    }

    read(absolutePath : string, cb : (IResponse) => any) {
        absolutePath = FileUtils.normalizePath(absolutePath);

        this._env.log('Getting "%s" from database "%s"...', absolutePath, this.name);

        this._openDb().done((db : IDBDatabase) => {
            var request = db.transaction(FileDb._FILE_STORE, FileDb._READ_ONLY)
                            .objectStore(FileDb._FILE_STORE)
                            .get(absolutePath);

            request.onsuccess = (ev) => {
                if (typeof(request.result) === 'undefined') {
                    this._env.log('\tINFO: No file found at path "%s" in database "%s".', absolutePath, this.name);
                    cb({ success: false, error: ['No file found at path "', absolutePath, '" in database "', this.name, '".'].join('') });
                }
                else {
                    this._env.log('\tSUCCESS: Got "%s" from database "%s".', absolutePath, this.name);
                    cb({ success: true, result: new File(request.result) });
                }
            }

            request.onerror = (ev) => {
                this._env.log('\tFAILURE: Could not get "%s" from database "%s".', absolutePath, this.name);
                cb({ success: false, error: request.error });
            }
        });
    }

    save(fileData : IFileData, cb? : (IResponse) => any) {
        if (!cb) {
            cb = FileDb._NOOP;
        }

        var file = new File(fileData);

        this._env.log('Saving "%s" to database "%s"...', file.absolutePath, this.name);

        var transactionConfig : ITransactionConfig = {
            mode        : FileDb._READ_WRITE,
            successMsg  : ['\tSUCCESS: Transaction for saving "', file.absolutePath, '" to database "', this.name, '" completed.'].join(''),
            abortMsg    : ['\tFAILURE: Transaction aborted while saving "', file.absolutePath, '" to database "', this.name, '".'].join(''),
            errorMsg    : ['\tFAILURE: Could not save "', file.absolutePath, '" to database "', this.name, '".'].join('')
        };

        this._getTransaction(transactionConfig, cb)
            .next((transaction : IDBTransaction) => {
                this._addChildReferenceFor(file, transaction);

                return cb =>
                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .put(file.getStoreObject())
                        .onsuccess = cb
            })
            .done(() => 
                this._env.log('\t\tSUCCESS: Saved "%s" to database "%s".', file.absolutePath, this.name);
            );
    }

    remove(absolutePath : string, cb? : (IResponse) => any) {
        if (!cb) {
            cb = FileDb._NOOP;
        }

        absolutePath = FileUtils.normalizePath(absolutePath);

        this._env.log('Removing "%s" from database "%s"...', absolutePath, this.name);

        var transactionConfig : ITransactionConfig = {
            mode        : FileDb._READ_WRITE,
            successMsg  : ['\tSUCCESS: Transaction for removal of "', absolutePath, '" from database "', this.name, '" completed.'].join(''),
            errorMsg    : ['\tFAILURE: Could not remove "', absolutePath, '" from database "', this.name, '".'].join(''),
            abortMsg    : ['\tFAILURE: Transaction aborted while deleting "', absolutePath, '" from database "', this.name, '".'].join('')
        };

        this._getTransaction(transactionConfig, cb)
            .next((transaction : IDBTransaction) => {
                this._removeChildReferenceFor(absolutePath, transaction);

                return cb => 
                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .get(absolutePath)
                        .onsuccess = (ev) => {
                            var result = (<any> ev.target).result;

                            if (typeof(result) === 'undefined') {
                                (<any> ev.target).transaction.abort();
                            }
                            else cb(new File(result), transaction);
                        }
            })
            .next((root : IFile, transaction : IDBTransaction) => {
                return cb => this._traverseWithAction(
                    transaction,
                    root,
                    (child : IFile) =>
                        transaction
                            .objectStore(FileDb._FILE_STORE)
                            .delete(child.absolutePath)
                            .onsuccess = ev => cb(child.absolutePath)
                );
            }).done((path : string) =>
                this._env.log(
                    '\t\tSUCCESS: Removing item "%s" from database "%s".',
                    path,
                    this.name
                )
            );
    }

    copy(source : string, destination : string, cb? : (IResponse) => any) {
        if (!cb) {
            cb = FileDb._NOOP;
        }

        source      = FileUtils.normalizePath(source);
        destination = FileUtils.normalizePath(destination);

        this._env.log('Copying "%s" to "%s" in database "%s"...', source, destination, this.name);

        var transactionConfig : ITransactionConfig = {
            mode        : FileDb._READ_WRITE,
            successMsg  : ['\tSUCCESS: Transaction for copying "', source, '" to "', destination, '" in database "', this.name, '" completed.'].join(''),
            errorMsg    : ['\tFAILURE: Could not copy "', source, '" to "', destination, '" in database "', this.name, '".'].join(''),
            abortMsg    : ['\tFAILURE: Transaction aborted while copying "', source, '" to "', destination, '" in database "', this.name, '".'].join('')
        };

        this._getTransaction(transactionConfig, cb)
            .next((transaction : IDBTransaction) => cb => this._copy(source, destination, transaction).done(cb))
            .done((source : string, destination : string, transaction : IDBTransaction) =>
                this._env.log('\t\tSUCCESS: Copied "%s" to "%s".', source, destination)
            );
    }

    move(source : string, destination : string, cb? : (IResponse) => any) {
        if (!cb) {
            cb = FileDb._NOOP;
        }

        source      = FileUtils.normalizePath(source);
        destination = FileUtils.normalizePath(destination);

        this._env.log('Moving "%s" to "%s" in database "%s"...', source, destination, this.name);

        var transactionConfig : ITransactionConfig = {
            mode        : FileDb._READ_WRITE,
            successMsg  : ['\tSUCCESS: Transaction for moving "', source, '" to "', destination, '" in database "', this.name, '" completed.'].join(''),
            errorMsg    : ['\tFAILURE: Could not move "', source, '" to "', destination, '" in database "', this.name, '".'].join(''),
            abortMsg    : ['\tFAILURE: Transaction aborted while moving "', source, '" to "', destination, '" in database "', this.name, '".'].join('')
        };

        this._getTransaction(transactionConfig, cb)
            .next((transaction : IDBTransaction) => {
                this._removeChildReferenceFor(source, transaction);
                return cb => this._copy(source, destination, transaction).done(cb)
            })
            .next((source : string, destination : string, transaction : IDBTransaction) => cb =>
                transaction
                    .objectStore(FileDb._FILE_STORE)
                    .delete(source)
                    .onsuccess = ev => cb(source, destination)
            )
            .done((source : string, destination : string) =>
                this._env.log('\t\tSUCCESS: Moved "%s" to "%s".', source, destination)
            );
    }
}

export function open(config : IFileDbConfig) : IFileDb {
    return new FileDb(config);
}