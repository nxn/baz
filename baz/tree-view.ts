/// <reference path="tree-view.d.ts" />
/// <reference path="jquery.d.ts" />

import async = module("./async");
import utils = module("./utils");

class FSTreeNode implements IFSTreeNode {
    id                  : string;
    nodes               : FSTreeNode[];

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _file       : IFileInfo;
    private _$this      : JQuery;
    private _$parent    : JQuery;

    constructor(
        file                : IFileInfo,
        $parent             : JQuery,
        db                  : IFileDb, 
        environment         : IEnvironment
    ) {
        this._db    = db;
        this._env   = environment;
        this._file  = file;
        this.id     = utils.Guid.make();
        this.nodes  = [];

        this.render();
    }

    private _getMimeClass() {
        return this._file.type.replace(/[\.\/]/g, '-');
    }

    render() {
        if (!this._$this) {
            this._$this = this._$parent.append('<div/>');
            this._$this.addClass(this._getMimeClass());
        }

        var $toggleWrapper = this._$this.append('<div/>').addClass('toggle-content-view');
        var $toggleButton  = $toggleWrapper.append('<div/>').addClass('btn');

        var $icon = this._$this.append('<div/>').addClass('icon');
        var $name = this._$this.append('<div/>').addClass('name').text(this._file.name);

        var $actions = this._$this.append('<div/>').addClass('actions');

        if (this._db.utils.isDirectory(this._file)) {
            var $add = $actions.append('<div/>').addClass('add');
        }

        var $remove = $actions.append('<div/>').addClass('remove');

        var $contents = this._$this.append('<div/>').addClass('content');
    }

    open() {
        async
            .newTask(cb => this._db.get(this._file.location + this._file.name, cb))
            .done((response : IResponse) => {
                if (response.success) {
                    for (var i = 0, fileInfo : IFileInfo; fileInfo = response.result[i]; i++) {
                        var node = new FSTreeNode(
                            fileInfo,
                            this._$this.children('.content'),
                            this._db, 
                            this._env
                        )

                        this.nodes.push(node);
                    }
                    this._$this.addClass('open');
                }
                else {
                    this._env.log(
                        "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
                    );
                }
            }
        );
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

    constructor(config : IConfig) {
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

                if (response.success) {
                    this._root = new FSTreeNode(
                        response.result, 
                        $(this._parentSel), 
                        this._db, 
                        this._env
                    );
                }
                else {
                    this._env.log(
                        "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
                    );
                }

                this._root.open();
            }
        );
    }
}