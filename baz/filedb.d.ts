/// <reference path="guid.ts" />

interface IPathInfo {
    name        : string;
    location    : string;
}

interface IChildInfo {
    name        : string;
    type        : string;
    contentId   : string;
}

interface IChildInfoDictionary {
    [filename : string] : IChildInfo;
}

interface IFileInfo {
    name            : string;
    type            : string;
    contentId       : IGuid;
    location        : string;
    absolutePath    : string;
    children        : IChildInfoDictionary;
    size            : number;
    childCount      : number;
    forEachChild(fn : (child : IChildInfo) => any) : void;
}

interface IFileInfoData {
    name            : string;
    type            : string;
    location        : string;
    contentId?      : string;
    children?       : IChildInfoDictionary;
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

    getFileInfo(absolutePath : string, cb : (IResponse) => any);
    getFileContent(contentId : IGuid, cb : (IResponse) => any);
    getFileContent(absolutePath : string, cb : (IResponse) => any);
    putFileInfo(data : IFileInfoData, cb? : (IResponse) => any);
    putFileContent(data : any, cb? : (IResponse) => any);
    rm(absolutePath : string, cb? : (IResponse) => any);
    cp(source : string, destination : string, cb? : (IResponse) => any);
    mv(source : string, destination : string, cb? : (IResponse) => any);   
}