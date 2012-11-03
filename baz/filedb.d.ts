interface IChildInfo {
    name : string;
    type : string;
}

interface IChildInfoDictionary {
    [filename : string] : IChildInfo;
}

interface IPathInfo {
    name        : string;
    location    : string;
}

interface IFileInfo extends IChildInfo {
    location : string;
    children : IChildInfoDictionary;
}

interface IFileData extends IFileInfo {
    content     : any;
}

interface IFileStoreObject extends IFileData {
    absolutePath : string;
}

interface IFile extends IFileStoreObject {
    size            : number;
    childCount      : number;
    forEachChild(fn : (child : IChildInfo) => any) : void;
}

interface IFileDbConfig {
    name            : string;
    version?        : number;
    environment?    : IEnvironment;
}

interface IFileUtils {
    getAbsolutePath(padthInfo : IPathInfo)          : string;
    normalizePath(value : string)                   : string;
    trimTrailingSlashes(value : string)             : string;
    getPathInfo(absolutePath : string)              : IPathInfo;
}

interface IFileDb {
    name                : string;
    version             : number;
    get(absolutePath    : string,       cb: (IResponse) => any);
    put(file            : IFileData,    cb: (IResponse) => any);
    del(absolutePath    : string,       cb: (IResponse) => any);
    utils               : IFileUtils;
}