interface IEnvironment {
    log: (text: string, ...args : any[]) => void;
}

interface ICallback {
    (...args: any[]): any;
}

interface IAsyncOp {
    (callback: ICallback): any;
}

interface IResponse {
    success : boolean;
    error?  : any;
    result? : any;
}