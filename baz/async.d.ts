/// <reference path="common.d.ts" />

interface ITask {
    next(getNextAsyncTasks : Function) : ITask;
    done(cb : ICallback) : void;
}