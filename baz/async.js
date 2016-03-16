/// <reference path="async.d.ts" />
define(["require", "exports"], function (require, exports) {
    var Async;
    (function (Async) {
        // Expects a callback and an array of async tasks to execute. Once all tasks are complete, their 
        // resulting callback arguments will be forwarded to the given callback function. Each task's callback
        // arguments will be assigned to a single parameter of the overall callback function in order that the
        // tasks were given. I.e., the first task will have the first callback parameter, the second task will
        // have the second callback parameter, etc.
        function sync(cb, ops) {
            var resultArgs = new Array(ops.length), completed = 0;
            var getCb = function (i) {
                return function () {
                    resultArgs[i] = arguments;
                    completed++;
                    if (completed === ops.length) {
                        cb.apply(null, resultArgs);
                    }
                };
            };
            /*
            var getCb = (i) => {
                return () => {
                    resultArgs[i] = arguments;
                    completed++;
    
                    if (completed === ops.length) cb.apply(null, resultArgs);
                }
            };
            */
            for (var i = 0, op; op = ops[i]; i++)
                op(getCb(i));
        }
        Async.sync = sync;
        var Task = (function () {
            function Task(ops, returnInArray) {
                if (returnInArray === void 0) { returnInArray = false; }
                if (returnInArray || ops.length > 1) {
                    // this.op = cb => sync(() => cb.apply(null, arguments), ops);
                    this.op = function (cb) {
                        return sync(function () {
                            return cb.apply(null, arguments);
                        }, ops);
                    };
                }
                else if (ops.length === 1) {
                    this.op = ops[0];
                }
                else {
                    this.op = function (cb) { return cb(); };
                }
            }
            // Takes a function that will be invoked with the arguments that were given to the current async task's
            // callback. So if the current task executes its callback with data that was returned from an ajax call 
            // the function given to 'next' will get this data for processing and creating a new async task. The 
            // given function is expected to return one, or more, new asynchronous operations.
            Task.prototype.next = function (getNextAsyncOps) {
                var _this = this;
                // Returns a new async operation that, when ready, will first execute this async operation using an
                // intermediate callback. The callback's purpose is to forward the task's result arguments to one,
                // or more, new operations that are returned by the passed in 'getNextAsyncTasks' function. The 
                // resulting operations will be invoked when the new Async object receives its callback.
                return new Task([
                    function (cb) {
                        return _this.op(function () {
                            var nextOps = getNextAsyncOps.apply(null, arguments);
                            if (nextOps instanceof Function) {
                                nextOps(cb);
                            }
                            else {
                                if (nextOps instanceof Array) {
                                    sync(cb, nextOps);
                                }
                                else {
                                    cb();
                                }
                            }
                        });
                    }
                ]);
            };
            // Executes this async task with the given callback function for handling the task's results
            Task.prototype.done = function (cb) { this.op(cb); };
            return Task;
        })();
        Async.Task = Task;
    })(Async || (Async = {}));
    function newTask() {
        var ops = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ops[_i - 0] = arguments[_i];
        }
        return new Async.Task(ops);
    }
    exports.newTask = newTask;
    function newTaskSeq(ops) {
        return new Async.Task(ops, true);
    }
    exports.newTaskSeq = newTaskSeq;
});
