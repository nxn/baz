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

interface IFSTreeViewBGLayer {
}