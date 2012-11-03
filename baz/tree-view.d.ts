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

    toggle()    : void;
    open()      : void;
    close()     : void;
}

interface IFSTreeViewBGLayer {
}