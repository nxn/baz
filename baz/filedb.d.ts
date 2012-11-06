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

interface IFileInfo extends IChildInfo {
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

    read(absolutePath : string, cb : (IResponse) => any);
    save(file : IFileInfoData, cb? : (IResponse) => any);
    remove(absolutePath : string, cb? : (IResponse) => any);
    copy(source : string, destination : string, cb? : (IResponse) => any);
    move(source : string, destination : string, cb? : (IResponse) => any);   
}