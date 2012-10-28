interface IChildInfo {
    name : string;
    type : string;
}

interface IFileInfo extends IChildInfo {
    location : string;
}

interface IFileData extends IFileInfo {
    content : any;
}

interface IFileStoreObject extends IFileData {
    absolutePath : string;
}

interface IFile extends IFileStoreObject {
    size                : number;
    isDirectory         : bool;
}

interface IFileDbConfig {
    name            : string;
    version?        : number;
    environment?    : IEnvironment;
}

interface IFileUtils {
    getAbsolutePath (fileInfo   : IFileInfo)    : string;
    isDirectory     (thing      : any)          : bool;
}

interface IFileDb {
    name                : string;
    version             : number;
    get(absolutePath    : string,       cb: (IResponse) => any);
    put(file            : IFileData,    cb: (IResponse) => any);
    del(absolutePath    : string,       cb: (IResponse) => any);
    utils               : IFileUtils;
}