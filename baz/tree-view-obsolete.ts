///// <reference path="common.d.ts" />
///// <reference path="filedb.d.ts" />

//import async = module('./async');

//declare var Handlebars, $;

//interface ITreeItem {
//    id      : string;
//    file    : IFileInfo;
//    indent  : number;
//    $el     : any;

//    renderTo(
//        $element     : any,
//        indentAmount : number,
//        indentOffset : number
//    ) : void;
//}

//export interface IConfig {
//    db              : IFileDb;
//    environment     : IEnvironment;
//    parentSel       : string;
//    templateSel     : string;
//    indentAmount?   : number;
//    indentOffset?   : number;
//}

//class TreeItem implements ITreeItem {
//    id : string;
//    $el : any;

//    constructor(
//        public file : IFileInfo,
//        public indent = 0
//    ) {

//    }

//    renderTo(
//        $element     : any,
//        indentAmount : number,
//        indentOffset : number
//    ) {
//        this.$el = $element;
//    }
//}

//export class FSTreeView {
//    private static _DEFAULT_ENV : IEnvironment  = { log: function(any, ...args : any[]) { } }

//    private _db             : IFileDb;
//    private _env            : IEnvironment;
//    private _templateSel    : string;
//    private _parentSel      : string;

//    public indentAmount : number;
//    public indentOffset : number;

//    constructor(config : IConfig) {
//        this._db            = config.db;
//        this._env           = config.environment  || FSTreeView._DEFAULT_ENV;
//        this._templateSel   = config.templateSel;
//        this._parentSel     = config.parentSel;
//        this.indentAmount   = config.indentAmount || 20;
//        this.indentOffset   = config.indentOffset || 0;

//        async
//            .newTask(cb => this._db.get('/', cb))
//            .done(
//                (response : IResponse) => {
//                    if (response.success) {
//                        $(() => this.render(response.result))
//                    } 
//                    else {
//                        this._env.log(
//                            "Failed to open FS root (tree-view.ts:FSTreeView:constructor)"
//                        );
//                    }
//                }
//            );
              
        
//         //this._flatten(config.data, 0, []);
//    }

//    render(root : IFile) {
//        var $parent = $(this._parentSel), item;

//        for (var i = 0, fileInfo : IFileInfo; fileInfo = root.content[i]; i++) {
//            item = new TreeItem(fileInfo, 0);
//            item.renderTo(
//                $parent.append("<div/>"),
//                this.indentAmount, 
//                this.indentOffset
//            );
//        }
//    }

//    open(parent : ITreeItem) {
//        var absolutePath = parent.file.location + parent.file.name;
//        async
//            .newTask(cb => this._db.get(absolutePath, cb))
//            .done(
//                (response : IResponse) => {
//                    var child : ITreeItem, dir : IFile;

//                    if (response.success) {
//                        dir = response.result;
//                        for (var i = 0, fileInfo : IFileInfo; fileInfo = dir.content[i]; i++) {
//                            child = new TreeItem(fileInfo, parent.indent + 1);
//                            //child.renderTo(
//                        }
//                    } 
//                    else {
//                        this._env.log(
//                            'Failed to open item "%s" (tree-view.ts:FSTreeVew:open)', absolutePath
//                        );
//                    }
//                }
//            );
//    }

//    close(parent : ITreeItem) {

//    }

//    //private _flatten(root, indent, items : IItem[]) {
//    //    var i, node;

//    //    if (root instanceof Array) {
//    //        for (i = 0; node = root[i]; i++) {
//    //            this._flatten(node, indent, items);
//    //        }
//    //    } else if (root instanceof Object) {
//    //        items.push(
//    //            new Item( root.name
//    //                    , root.type
//    //                    , indent
//    //                    )
//    //        );

//    //        if (!root.hasOwnProperty('contents')) {
//    //            return items;
//    //        }

//    //        for (i = 0; node = root.contents[i]; i++) {
//    //            this._flatten(node, indent + 1, items);
//    //        }
//    //    }

//    //    return items;
//    //}
//}