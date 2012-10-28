/// <reference path="filedb.d.ts" />
/// <reference path="common.d.ts" />

interface IConfig {
    db              : IFileDb;
    environment     : IEnvironment;
    parentSel       : string;
}

interface IFSTreeNode {
    id          : string;
    nodes       : IFSTreeNode[];

    render()    : void;
    open()      : void;
    close()     : void;
}

interface IFSTreeViewBGLayer {
}