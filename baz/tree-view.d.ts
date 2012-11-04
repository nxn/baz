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

    render()    : void;
    toggle(cb?  : ICallback)    : void;
    open(cb?    : ICallback)    : void;
    close(cb?   : ICallback)    : void;
}

interface IFSTreeViewEventHandler {
    (sender : IFSTreeNode): any;
}

interface IFSTreeView {
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