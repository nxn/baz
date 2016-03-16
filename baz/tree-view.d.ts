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
    isOpen      : boolean;

    render()    : void;
    toggle(cb?  : ICallback)    : void;
    open(cb?    : ICallback)    : void;
    close(cb?   : ICallback)    : void;
}

interface IFSTreeViewEventHandler {
    (sender : IFSTreeNode): any;
}

interface IFSTreeView {
    indentAmount : number;
    render()                                        : void;
    traverse(fn : (node : IFSTreeNode) => boolean)     : void;
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