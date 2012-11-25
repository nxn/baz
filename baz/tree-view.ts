/// <reference path="tree-view.d.ts" />
/// <reference path="jquery.d.ts" />

import async = module("./async");
import g = module("./guid");

class FSTreeNode implements IFSTreeNode {
    id                  : string;
    nodes               : IFSTreeNode[];
    isOpen              : bool;
    file                : IFileNode;

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _$this      : JQuery;
    private _$parent    : JQuery;
    private _tree       : FSTreeView;
    private _indent     : number;

    private static _EFFECT_DURATION = 100;
    private static _NOOP            = function() { };
    private static _TYPE_ORDER : { [type : string] : number; } = 
        (function() {
            var order = {};
            order["application/vnd.baz.solution"]   = 1;
            order["application/vnd.baz.project"]    = 2;
            order["applicatoin/vnd.baz.directory"]  = 3;
            return order;
        })();

    constructor(
        file            : IFileNode,
        $parent         : JQuery,
        db              : IFileDb, 
        environment     : IEnvironment,
        tree            : FSTreeView,
        indentLevel?    : number
    ) {
        this._db        = db;
        this._env       = environment;
        this.file      = file;
        this._$parent   = $parent;
        this._tree      = tree;
        this._indent    = indentLevel || 0;
        this.id         = g.Guid.generate().value;
        this.isOpen     = false;
    }

    private _getMimeClass() {
        return this.file.type.replace(/[\.\/]/g, '-');
    }

    private _dragStart(e : DragEvent) {
        e.stopImmediatePropagation();
        e.dataTransfer.setData('text/plain', this.file.absolutePath);
        this._tree.dragSourceNode = this;
    }

    private _dragEnd(e : DragEvent) {
        this._tree.dragSourceNode = null;
    }

    private _dragOver(e : DragEvent) {
        e.stopImmediatePropagation();
        
        var source = this._tree.dragSourceNode;
        if (source === this || this === this._tree.root) {
            return;
        }

        e.preventDefault();
        
        this._$this.addClass('drag-hover');

        return false;
    }

    private _dragLeave(e : DragEvent) {
        this._$this.removeClass('drag-hover');
    }

    private _dragDrop(e : DragEvent) {
        e.stopImmediatePropagation();
        e.preventDefault();

        this._$this.removeClass('drag-hover');

        var sourcePath = e.dataTransfer.getData('text/plain')
          , sourceNode = this._tree.dragSourceNode;

        if (sourceNode.file.absolutePath !== sourcePath) {
            return false
        }

        sourceNode.move(this);
    }

    get domElement() : HTMLElement {
        return this._$this.get();
    }

    move(parent : IFSTreeNode, cb? : ICallback) {
        var moveView = (response : IResponse) => {
            if (response.success) {
                
            }
        };

        this._db.mv(
            this.file.absolutePath, 
            this._db.utils.normalizePath(parent.file.absolutePath + '/' + this.file.name),
            moveView
        );
    }

    copy(parent : IFSTreeNode, cb? : ICallback) {
        var copyView = (response : IResponse) => {
            if (response.success) {

            }
            cb && cb(response);
        }

        this._db.cp(
            this.file.absolutePath,
            this._db.utils.normalizePath(parent.file.absolutePath + '/' + this.file.name),
            copyView
        );
    }

    render() {
        if (!this._$this) {
            this._$this = $('<div/>')
                .appendTo(this._$parent)
                .addClass('node')
                .attr('id', this.id)
                .attr('draggable', 'true')
                .bind('dragstart',  (e) => this._dragStart(e.originalEvent))
                .bind('dragover',   (e) => this._dragOver(e.originalEvent))
                .bind('dragleave',  (e) => this._dragLeave(e.originalEvent))
                .bind('drop',       (e) => this._dragDrop(e.originalEvent))
                .bind('dragend',    (e) => this._dragEnd(e.originalEvent));
        }

        var $itemContainer = $('<div/>')
            .addClass('item-container')
            .appendTo(this._$this)
            .css('padding-left', (this._tree.indentAmount * this._indent) + 'px')
            .hover(
                () => this._tree.fireNodeMouseIn(this),
                () => this._tree.fireNodeMouseOut(this)
            );

        var $item = $('<div/>').appendTo($itemContainer).addClass('item ' + this._getMimeClass())

        var $toggleWrapper  = $('<div/>').appendTo($item).addClass('toggle-content-view');

        if (this.file.childCount > 0) {
            $('<div/>').appendTo($toggleWrapper).addClass('btn').click( _ => this.toggle() );
        }

        var $icon = $('<div/>').appendTo($item).addClass('icon');
        var $name = $('<div/>').appendTo($item).addClass('name').text(this.file.name);

        var $actions = $('<div/>').appendTo($item).addClass('actions');
        var $refresh = $('<div/>').appendTo($actions).addClass('refresh').click( _ => this.refresh() );
        var $add     = $('<div/>').appendTo($actions).addClass('add');
        var $remove  = $('<div/>').appendTo($actions).addClass('remove');

        var $contents = $('<div/>').appendTo(this._$this).addClass('content');

        if (this.nodes) {
            for (var i = 0, node : IFSTreeNode; node = this.nodes[i]; i++) {
                node.render();
            }
        }
    }

    toggle(cb? : ICallback) {
        if (this.isOpen)    this.close(cb);
        else                this.open(cb);
    }

    open(cb? : ICallback) {
        this._$this.addClass('open');
        this.isOpen = true;

        var $content = this._$this.children('.content').hide();
        this.refresh(() => {
            $content.slideDown(FSTreeNode._EFFECT_DURATION, () => {
                this._tree.fireTreeChange(this);
                cb && cb();
            })
        });
    }

    close(cb? : ICallback) {
        this._$this.removeClass('open');
        this.isOpen = false;

        var $content = this._$this.children('.content');
        $content.slideUp(FSTreeNode._EFFECT_DURATION, () => { 
            $content.empty();
            this.nodes = null;
            this._tree.fireTreeChange(this);
            cb && cb();
        });
    }

    refresh(cb? : ICallback) {
        this._$this.children('.content').empty()
        var absolutePath = this.file.absolutePath;

        async
            .newTask((cb) => this._db.getFileNode(absolutePath, cb))
            .next((response : IResponse) => {
                if (!response.success) {
                    this._env.log('Error refreshing "%s"', absolutePath);
                    return;
                }

                this.file = response.result;
                var i = 0, asyncOps = new Array(this.file.childCount);

                this.file.forEachChild((child : IChildNode) => {
                    asyncOps[i++] = (cb =>
                        this._db.getFileNode(
                            this._db.utils.getAbsolutePath({
                                name    : child.name,
                                location: this.file.absolutePath
                            }),
                            cb
                        )
                    );
                });

                // redundant lambda necessary for binding the context
                return cb => async.newTaskSeq(asyncOps).done(cb);
            })
            .done(
                function(...argArray : IArguments[]) => {
                    var response : IResponse;

                    var nodes : FSTreeNode[] = new Array(this.file.childCount);
                    
                    for (var i = 0, args : IArguments; args = argArray[i]; i++) {
                        response = args[0];

                        if (!response.success) {
                            this._env.log('FAILURE: Could not open child of "%s".', this.file.absolutePath);
                        }

                        nodes[i] = new FSTreeNode(
                            response.result, 
                            this._$this.children('.content'), 
                            this._db, 
                            this._env,
                            this._tree,
                            this._indent + 1
                        );
                    }

                    // redundant lambda necessary for binding the context
                    this.nodes = nodes.sort(
                        (a : FSTreeNode, b : FSTreeNode) => this._compareFn(a, b)
                    );

                    for (var i = 0, node : IFSTreeNode; node = this.nodes[i]; i++) {
                        node.render();
                    }

                    cb && cb();
                }
            );
    }

    private _compareType(a : FSTreeNode, b : FSTreeNode) : number {
        var aType               = a.file.type
          , bType               = b.file.type
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
        if (a.file.name === b.file.name) {
            return 0;
        }
        return a.file.name > b.file.name ? 1 : -1;
    }

    private _compareFn(a : FSTreeNode, b : FSTreeNode) : number {
        var type = this._compareType(a, b);
        if (type != 0) {
            return type;
        }

        return this._compareName(a, b);
    }
}

export class FSTreeView implements IFSTreeView {
    private static _DEFAULT_ENV : IEnvironment  = { log: function(any, ...args : any[]) { } }

    private _db         : IFileDb;
    private _env        : IEnvironment;
    private _path       : string;
    private _bg         : IFSTreeViewBGLayer;
    private _parentSel  : string;
    private _$this      : JQuery;

    private _treeChangeHandlers     : IFSTreeViewEventHandler[];
    private _nodeSelectHandlers     : IFSTreeViewEventHandler[];
    private _nodeMouseInHandlers    : IFSTreeViewEventHandler[];
    private _nodeMouseOutHandlers   : IFSTreeViewEventHandler[];

    indentAmount    : number;
    root            : IFSTreeNode;
    dragSourceNode  : IFSTreeNode;

    constructor(config : IFSTreeConfig) {
        this.indentAmount   = config.indentAmount   || 20;
        this._db            = config.db;
        this._path          = config.path           || '/';
        this._env           = config.environment    || FSTreeView._DEFAULT_ENV;
        this._parentSel     = config.parentSel;

        this._treeChangeHandlers    = [];
        this._nodeMouseInHandlers   = [];
        this._nodeMouseOutHandlers  = [];
        this._nodeSelectHandlers    = [];

        $(() => {
            this.render();
            this._openRoot();
        });
    }

    render() {
        if (!this._$this) {
            this._$this = $('<div/>').addClass('tree-view').appendTo(this._parentSel);
        }
    }

    private _openRoot() {
        async
            .newTask(cb => this._db.getFileNode(this._path, cb))
            .done((response : IResponse) => {
                if (!response.success) {
                    this._env.log(
                        "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
                    );
                }

                this.root = new FSTreeNode(
                    response.result, 
                    this._$this, 
                    this._db, 
                    this._env,
                    this
                );
                
                this.root.render();
                this.root.open();
            }
        );
    }

    traverse(fn : (node : IFSTreeNode) => bool) {
        this._traverse(this.root, fn);
    }

    private _traverse(startNode : IFSTreeNode, fn : (node :IFSTreeNode) => bool) {
        if (!fn(startNode) || !startNode.isOpen || !startNode.nodes) {
            return;
        }

        for (var i = 0, node; node = startNode.nodes[i]; i++) {
            this._traverse(node, fn);
        }
    }

    fireTreeChange(sender : IFSTreeNode) {
        for (var i = 0, handler; handler = this._treeChangeHandlers[i]; i++) {
            handler(sender);
        }
    }

    fireNodeSelect(sender : IFSTreeNode) {
        for (var i = 0, handler; handler = this._nodeSelectHandlers[i]; i++) {
            handler(sender);
        }
    }

    fireNodeMouseIn(sender : IFSTreeNode) {
        for (var i = 0, handler; handler = this._nodeMouseInHandlers[i]; i++) {
            handler(sender);
        }
    }

    fireNodeMouseOut(sender : IFSTreeNode) {
        for (var i = 0, handler; handler = this._nodeMouseOutHandlers[i]; i++) {
            handler(sender);
        }
    }

    onTreeChange(handler : IFSTreeViewEventHandler) {
        this._treeChangeHandlers.push(handler);
    }

    onNodeHover(mouseIn : IFSTreeViewEventHandler, mouseOut : IFSTreeViewEventHandler) {
        this._nodeMouseInHandlers.push(mouseIn);
        this._nodeMouseOutHandlers.push(mouseOut);
    }

    onNodeSelect(handler: IFSTreeViewEventHandler) {
        this._nodeSelectHandlers.push(handler);
    }
}