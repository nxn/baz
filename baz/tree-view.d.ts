/// <reference path="filedb.d.ts" />
/// <reference path="common.d.ts" />

interface IFSTreeConfig {
    db              : IFileDb;
    environment     : IEnvironment;
    parentSel       : string;
    path            : string;
    indentAmount?   : number;
}

interface IFSTreeNode {
    id          : string;
    nodes       : IFSTreeNode[];
    isOpen      : bool;
    file        : IFileNode;
    domElement  : HTMLElement;
    parent      : IFSTreeNode;
    indent      : number;

    add(node : IFSTreeNode) : IFSTreeNode;
    remove(node : IFSTreeNode) : void;
    render() : void;
    toggle(cb? : ICallback) : void;
    open(cb? : ICallback) : void;
    close(cb? : ICallback) : void;
    move(parent : IFSTreeNode, cb? : ICallback) : void;
    copy(parent : IFSTreeNode, cb? : ICallback) : void;
}

interface IFSTreeViewEventHandler {
    (sender : IFSTreeNode): any;
}

interface IFSTreeView {
    indentAmount : number;
    render()                                        : void;
    traverse(fn : (node : IFSTreeNode) => bool)     : void;
    onTreeChange(handler : IFSTreeViewEventHandler) : void;
    onNodeSelect(handler: IFSTreeViewEventHandler)  : void;
    onNodeHover(
        mouseInHandler  : IFSTreeViewEventHandler,
        mouseOutHandler : IFSTreeViewEventHandler
    ) : void;
}

interface IFSTreeViewBGLayer {
    render() : void;
    ensureItems(itemIds : string[]) : void;
    select(id : string) : void;
    mouseOver(id : string) : void;
    mouseOut(id : string) : void;
}