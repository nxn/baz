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

    constructor(fileData : IFileData) {
        this.name       = fileData.name;
        this.location   = fileData.location;
        this.type       = fileData.type;
        this.content    = fileData.content;
        this.children   = fileData.children || { };
    }

    addChild(file : IChildInfo) {
        this.children[file.name] = { name : file.name, type : file.type };
    }

    removeChild(filename) {
        delete this.children[filename];
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
        for (var i = 0, file : IChildInfo; file = this.children[files[i]]; i++) {
            // TODO: recursively sum sub sizes
        }

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
    var rxFilenameAndLocation   = /^(\/(?:.*\/)?)(.*)$/

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

    export function getAbsolutePath(fileInfo : IFileInfo) {
        return fileInfo.location + fileInfo.name;
    }

    export function getFilenameAndLocation(absolutePath : string) {
        absolutePath = normalizePath(absolutePath);
        var results = rxFilenameAndLocation.exec(absolutePath);
        return {
            location    : results[1],
            name        : results[2]
        }
    }
}

class FileDb implements IFileDb {
    private static _OPEN_DBS                    : { [dbName : string] : IDBDatabase; } = { };
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

    private _getDb() {
        return async.newTask(cb => {
            if (FileDb._OPEN_DBS.hasOwnProperty(this.name)) {
                cb(FileDb._OPEN_DBS[this.name]);
                return;
            }

            this._env.log('Opening database "%s", version "%d"...', this.name, this.version);
            var request = FileDb._INDEXEDDB.open(this.name, this.version);

            request.onsuccess = (ev) => {
                var result : IDBDatabase = request.result;

                this._env.log('\tOpened database "%s", version "%d".', result.name, result.version);
                FileDb._OPEN_DBS[this.name] = result;
                cb(result);
            }

            request.onerror = (ev) => {
                this._env.log("Unhandled error: ", request.error);
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
            type        : 'application/vnd.baz.solution',
            content     : null,
            children    : { }
        }

        fileStore.put(new File(root))
            .onerror = (ev) => {
                this._env.log('\tFAILURE: Could not create ROOT in database "%s".', this.name)
            };
    }

    get(absolutePath : string, cb : (IResponse) => any) {
        absolutePath = FileUtils.normalizePath(absolutePath);

        this._env.log('Getting "%s" from database "%s"...', absolutePath, this.name);

        this._getDb().done((db : IDBDatabase) => {
            var request = db.transaction(FileDb._FILE_STORE, FileDb._READ_ONLY)
                            .objectStore(FileDb._FILE_STORE)
                            .get(absolutePath);

            request.onsuccess = (ev) => {
                this._env.log('\tSUCCESS: Got "%s" from database "%s".', absolutePath, this.name);
                cb({ success: true, result: new File(request.result) })
            }

            request.onerror = (ev) => {
                this._env.log('\tFAILURE: Could not get "%s" from database "%s".', absolutePath, this.name);
                cb({ success: false, error: request.error });
            }
        });
    }

    put(fileData : IFileData, cb : (IResponse) => any) {
        var file = new File(fileData);

        this._env.log('Saving "%s" to database "%s"...', file.absolutePath, this.name);
        this._getDb()

            // Setup the transaction, and get the file's parent
            .next((db : IDBDatabase) =>
                cb => {
                    var transaction = db.transaction(FileDb._FILE_STORE, FileDb._READ_WRITE);

                    transaction.onerror = (ev) => {
                        this._env.log('\tFAILURE: Could not save "%s" to database "%s".', file.absolutePath, this.name);
                        cb({ success: false, error: (<any> ev.target).error });
                    }

                    transaction.onabort = (ev) => {
                        this._env.log(
                            '\tFAILURE: Transaction aborted while saving "%s" to database "%s".',
                            file.absolutePath,
                            this.name
                        );
                        cb({ success: false, error: (<any> ev.target).error });
                    } 

                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .get(file.location)
                        .onsuccess = (ev) => {
                            var result = (<any> ev.target).result;

                            if (typeof result === 'undefined') {
                                transaction.abort();
                                return;
                            }

                            cb(result, transaction);
                        }
                }
            )

            // Add the file's info to the parent's list of files
            .next((parentData : IFileData, transaction : IDBTransaction) =>
                cb => {
                    var parent = new File(parentData);
                    parent.addChild(file);

                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .put(parent.getStoreObject())
                        .onsuccess = (ev) => cb(transaction);
                }
            )

            // Finally add the file itself to the store
            .done((transaction: IDBTransaction) => {
                transaction
                    .objectStore(FileDb._FILE_STORE)
                    .put(file.getStoreObject())
                    .onsuccess = (ev) => {
                        this._env.log('\tSUCCESS: Saved "%s" to database "%s".', file.absolutePath, this.name);
                        cb({ success: true, result: (<any> ev.target).result });
                    }
            });
    }

    del(absolutePath : string, cb : (IResponse) => any) {
        absolutePath = FileUtils.normalizePath(absolutePath);

        this._env.log('Removing "%s" from database "%s"...', absolutePath, this.name);
        var pathInfo = FileUtils.getFilenameAndLocation(absolutePath);

        this._getDb()
            .next((db : IDBDatabase) =>
                cb => {
                    var transaction = db.transaction(FileDb._FILE_STORE, FileDb._READ_WRITE);
                    transaction.onerror = (ev) => {
                        this._env.log('\tFAILURE: Could not remove "%s" from database "%s".', absolutePath, this.name);
                        cb({ success: false, error: (<any> ev.target).error });
                    }

                    transaction.onabort = (ev) => {
                        this._env.log(
                            '\tFAILURE: Transaction aborted while deleting "%s" from database "%s".',
                            absolutePath,
                            this.name
                        );
                        cb({ success: false, error: (<any> ev.target).error });
                    } 

                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .get(pathInfo.location)
                        .onsuccess = (ev) => {
                            var result = (<any> ev.target).result;

                            if (typeof(result) === 'undefined') {
                                transaction.abort();
                                return;
                            }

                            cb(result, transaction);
                        }
                }
            )
            
            .next((parentData : IFileData, transaction : IDBTransaction) =>
                cb => {
                    var parent = new File(parentData);

                    parent.removeChild(pathInfo.name);

                    transaction
                        .objectStore(FileDb._FILE_STORE)
                        .put(parent.getStoreObject())
                        .onsuccess = (ev) => cb(transaction);
                }
            )

            .done((transaction : IDBTransaction) =>
                transaction
                    .objectStore(FileDb._FILE_STORE)
                    .delete(absolutePath)
                    .onsuccess = (ev) => {
                        this._env.log('\tSUCCESS: Removed  "%s" from database "%s".', absolutePath, this.name);
                        cb({ success: true, result: (<any> ev.target).result });
                    }
            );
    }

    private _traverseWithAction(
        root : IFile, 
        action : (file : IFile) => any, 
        transaction : IDBTransaction
    ) {
    }
}

export function open(config : IFileDbConfig) : IFileDb {
    return new FileDb(config);
}