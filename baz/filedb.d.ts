/// <reference path="guid.ts" />

interface IPathInfo {
    name        : string;
    location    : string;
}

interface IChildNode {
    name        : string;
    type        : string;
}

interface IChildNodeDictionary {
    [filename : string] : IChildNode;
}

interface IFileNode {
    name            : string;
    type            : string;
    contentId       : IGuid;
    location        : string;
    absolutePath    : string;
    children        : IChildNodeDictionary;
    size            : number;
    childCount      : number;
    forEachChild(fn : (child : IChildNode) => any) : void;
}

interface IFileNodeData {
    name            : string;
    type            : string;
    location        : string;
    contentId?      : string;
    children?       : IChildNodeDictionary;
}

interface IFileDbConfig {
    name            : string;
    version?        : number;
    environment?    : IEnvironment;
}

interface IFileUtils {
    getAbsolutePath(padthInfo : IPathInfo)  : string;
    normalizePath(value : string)           : string;
    trimTrailingSlashes(value : string)     : string;
    getPathInfo(absolutePath : string)      : IPathInfo;
}

interface IFileDb {
    name                : string;
    version             : number;
    utils               : IFileUtils;

    getFileNode(absolutePath : string, cb : (IResponse) => any) : void;
    putFileNode(data : IFileNodeData, cb? : (IResponse) => any) : void;
    getFileContent(contentId : IGuid, cb : (IResponse) => any) : void;
    getFileContent(absolutePath : string, cb : (IResponse) => any) : void;
    putFileContent(contentId : IGuid, data : any, cb? : (IResponse) => any) : void;
    putFileContent(absolutePath : string, data : any, cb? : (IResponse) => any) : void;
    rm(absolutePath : string, cb? : (IResponse) => any) : void;
    cp(source : string, destination : string, cb? : (IResponse) => any) : void;
    mv(source : string, destination : string, cb? : (IResponse) => any) : void;   
}