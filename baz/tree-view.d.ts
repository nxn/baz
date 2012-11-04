/// <reference path="filedb.d.ts" />
/// <reference path="common.d.ts" />

interface IFSTreeConfig {
    db              : IFileDb;
    environment     : IEnvironment;
    parentSel       : string;
    path            : string;
}

interface IFSTreeNode {
    id          : string;
    nodes       : IFSTreeNode[];
    isOpen      : bool;

    toggle(cb?  : ICallback)    : void;
    open(cb?    : ICallback)    : void;
    close(cb?   : ICallback)    : void;
}

interface IFSTreeViewEventHandler {
    (sender : IFSTreeNode): any;
}

interface IFSTreeView {
    traverse(fn : (node : IFSTreeNode) => bool) : void;
    onTreeChange(handler : IFSTreeViewEventHandler) : void;
}

interface IFSTreeViewBGLayer {
    ensureItems(nodes : IFSTreeNode[]) : void;
}