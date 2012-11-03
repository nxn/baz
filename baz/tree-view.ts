/// <reference path="tree-view.d.ts" />
/// <reference path="jquery.d.ts" />

import async = module("./async");
import utils = module("./utils");

class FSTreeNode implements IFSTreeNode {
    id                  : string;
    nodes               : FSTreeNode[];
    isOpen              : bool;

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _file       : IFile;
    private _$this      : JQuery;
    private _$parent    : JQuery;

    private static _TYPE_ORDER : { [type : string] : number; } = 
        (function() {
            var order = {};
            order["application/vnd.baz.solution"]   = 1;
            order["application/vnd.baz.project"]    = 2;
            order["applicatoin/vnd.baz.directory"]  = 3;
            return order;
        })();

    constructor(
        file                : IFile,
        $parent             : JQuery,
        db                  : IFileDb, 
        environment         : IEnvironment
    ) {
        this._db        = db;
        this._env       = environment;
        this._file      = file;
        this._$parent   = $parent;
        this.id         = utils.Guid.make();
        this.nodes      = [];
        this.isOpen     = false;

        //this._render();
    }

    private _getMimeClass() {
        return this._file.type.replace(/[\.\/]/g, '-');
    }

    render() {
        if (!this._$this) {
            this._$this = $('<div/>').appendTo(this._$parent).addClass('node');
        }

        var $file           = $('<div/>').appendTo(this._$this).addClass(this._getMimeClass() + " item");

        var $toggleWrapper  = $('<div/>').appendTo($file).addClass('toggle-content-view');

        if (this._file.childCount > 0) {
            $('<div/>').appendTo($toggleWrapper).addClass('btn').click( _ => this.toggle() );
        }

        var $icon           = $('<div/>').appendTo($file).addClass('icon');
        var $name           = $('<div/>').appendTo($file).addClass('name').text(this._file.name);

        var $actions        = $('<div/>').appendTo($file).addClass('actions');
        var $add            = $('<div/>').appendTo($actions).addClass('add');
        var $remove         = $('<div/>').appendTo($actions).addClass('remove');

        var $contents       = $('<div/>').appendTo(this._$this).addClass('content');
    }

    toggle() {
        if (this.isOpen)    this.close();
        else                this.open();
    }

    close() {
        this._$this.children('.content').empty();
        this._$this.removeClass('open');
        this.isOpen = false;
    }

    open() {
        this._$this.children('.content').empty();

        var i = 0, asyncOps = new Array(this._file.childCount);

        this._file.forEachChild((child : IChildInfo) => {
            asyncOps[i++] = (cb =>
                this._db.get(
                    this._db.utils.getAbsolutePath({
                        name    : child.name,
                        location: this._file.absolutePath
                    }),
                    cb
                )
            );
        });

        async
            .newTaskSeq(asyncOps)
            .done(
                function(...argArray : IArguments[]) => {
                    var response : IResponse;

                    this.nodes = new Array(this._file.childCount);
                    
                    for (var i = 0, args : IArguments; args = argArray[i]; i++) {
                        response = args[0];

                        if (!response.success) {
                            this._env.log('FAILURE: Could not open child of "%s".', this._file.absolutePath);
                        }

                        var node = new FSTreeNode(
                            response.result, 
                            this._$this.children('.content'), 
                            this._db, 
                            this._env
                        );

                        this.nodes[i] = node;
                    }

                    this.nodes = this.nodes.sort(
                        (a : FSTreeNode, b : FSTreeNode) => this._compareFn(a, b)
                    );

                    for (var i = 0, node : IFSTreeNode; node = this.nodes[i]; i++) {
                        node.render();
                    }

                    this._$this.addClass('open');
                    this.isOpen = true;
                }
            );
    }

    private _compareType(a : FSTreeNode, b : FSTreeNode) : number {
        var aType               = a._file.type
          , bType               = b._file.type
          , aPriority           = FSTreeNode._TYPE_ORDER[aType]
          , bPriority           = FSTreeNode._TYPE_ORDER[bType]
          , aPriorityUndefined  = typeof aPriority === 'undefined'
          , bPriorityUndefined  = typeof bPriority === 'undefined'

        if (aPriorityUndefined && bPriorityUndefined) {
            return 0;
        }

        if (aPriorityUndefined) {
            return 1;
        }

        if (bPriorityUndefined) {
            return -1;
        }
        
        if (aPriority === bPriority) {
            return 0
        };

        return aPriority > bPriority ? 1 : -1
    }

    private _compareName(a : FSTreeNode, b : FSTreeNode) : number {
        return a._file.name > b._file.name ? 1 : -1;
    }

    private _compareFn(a : FSTreeNode, b : FSTreeNode) : number {
        var type = this._compareType(a, b);
        if (type != 0) {
            return type;
        }

        return this._compareName(a, b);
    }
}

class FSTreeViewBGLayer implements IFSTreeViewBGLayer {
}

export class FSTreeView {
    private static _DEFAULT_ENV : IEnvironment  = { log: function(any, ...args : any[]) { } }

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _root       : IFSTreeNode;
    private _path       : string;
    private _bg         : IFSTreeViewBGLayer;
    private _parentSel  : string;

    constructor(config : IFSTreeConfig) {
        this._db            = config.db;
        this._path          = config.path           || '/';
        this._env           = config.environment    || FSTreeView._DEFAULT_ENV;
        this._parentSel     = config.parentSel;
        this._bg            = new FSTreeViewBGLayer();

        async
            .newTask(
                cb => this._db.get(this._path, cb),
                cb => $(cb)
            )
            .done((dbResponseArgs, domReadyArgs) => {
                var response : IResponse = dbResponseArgs[0];

                if (!response.success) {
                    this._env.log(
                        "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
                    );
                }

                this._root = new FSTreeNode(
                    response.result, 
                    $(this._parentSel), 
                    this._db, 
                    this._env
                );
                this._root.render();
                this._root.open();
            }
        );
    }
}