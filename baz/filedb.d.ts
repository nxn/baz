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

    getFileNode(absolutePath : string, cb : (response : IResponse) => any) : void;
    putFileNode(data : IFileNodeData, cb? : (response : IResponse) => any) : void;
    getFileContent(contentId : IGuid, cb : (response : IResponse) => any) : void;
    getFileContent(absolutePath : string, cb : (response : IResponse) => any) : void;
    putFileContent(contentId : IGuid, data : any, cb? : (response : IResponse) => any) : void;
    putFileContent(absolutePath : string, data : any, cb? : (response : IResponse) => any) : void;
    rm(absolutePath : string, cb? : (response : IResponse) => any) : void;
    cp(source : string, destination : string, cb? : (response : IResponse) => any) : void;
    mv(source : string, destination : string, cb? : (response : IResponse) => any) : void;   
}