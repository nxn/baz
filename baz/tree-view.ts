/// <reference path="tree-view.d.ts" />
/// <reference path="jquery.d.ts" />

import async = module("./async");
import utils = module("./utils");

class FSTreeNode implements IFSTreeNode {
    id                  : string;
    nodes               : FSTreeNode[];

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _file       : IFile;
    private _$this      : JQuery;
    private _$parent    : JQuery;

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

        this.render();
    }

    private _getMimeClass() {
        return this._file.type.replace(/[\.\/]/g, '-');
    }

    render() {
        if (!this._$this) {
            this._$this = $('<div/>').appendTo(this._$parent).addClass('node');
        }

        var $file           = $('<div/>').appendTo(this._$this).addClass(this._getMimeClass());

        var $toggleWrapper  = $('<div/>').appendTo($file).addClass('toggle-content-view');
        var $toggleButton   = $('<div/>').appendTo($file).addClass('btn');

        var $icon           = $('<div/>').appendTo($file).addClass('icon');
        var $name           = $('<div/>').appendTo($file).addClass('name').text(this._file.name);

        var $actions        = $('<div/>').appendTo($file).addClass('actions');
        var $add            = $('<div/>').appendTo($actions).addClass('add');
        var $remove         = $('<div/>').appendTo($actions).addClass('remove');

        var $contents       = $('<div/>').appendTo(this._$this).addClass('content');
    }

    open() {
        this._file.forEachChild((child : IChildInfo) => {
            async.newTask(cb =>
                this._db.get(
                    this._db.utils.getAbsolutePath({
                        name        : child.name,
                        location    : this._file.absolutePath
                    }),
                    cb
                )
            ).done((response : IResponse) => {
                if (!response.success) {
                    this._env.log('FAILURE: Could not open child of "%s".', this._file.absolutePath);
                }

                var node = new FSTreeNode(
                    response.result, 
                    this._$this.children('.content'), 
                    this._db, 
                    this._env
                );

                this.nodes.push(node);
                this._$this.addClass('open');
            });
        });





        //async
        //    .newTask(cb => 
        //        this._db.get(
        //            this._db.utils.getAbsolutePath({
        //                name    : this._file.name, 
        //                location: '' 
        //            }),
        //            cb
        //        )
        //    )
        //    .done((response : IResponse) => {
        //        if (response.success) {
        //            for (var i = 0, fileInfo : IFileInfo; fileInfo = response.result[i]; i++) {
        //                var node = new FSTreeNode(
        //                    fileInfo,
        //                    this._$this.children('.content'),
        //                    this._db, 
        //                    this._env
        //                )

        //                this.nodes.push(node);
        //            }
        //            this._$this.addClass('open');
        //        }
        //        else {
        //            this._env.log(
        //                "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
        //            );
        //        }
        //    }
        //);
    }

    close() {
        this._$this.children().remove();
        this._$this.removeClass('open');
    }
}

class FSTreeViewBGLayer implements IFSTreeViewBGLayer {
}

export class FSTreeView {
    private static _DEFAULT_ENV : IEnvironment  = { log: function(any, ...args : any[]) { } }

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _root       : IFSTreeNode;
    private _bg         : IFSTreeViewBGLayer;
    private _parentSel  : string;

    constructor(config : IFSTreeConfig) {
        this._db            = config.db;
        this._env           = config.environment  || FSTreeView._DEFAULT_ENV;
        this._parentSel     = config.parentSel;
        this._bg            = new FSTreeViewBGLayer();

        async
            .newTask(
                cb => this._db.get('/', cb),
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

                this._root.open();
            }
        );
    }
}