define(["require", "exports"], function(require, exports) {
    var Async;
    (function (Async) {
        function sync(cb, ops) {
            var resultArgs = new Array(ops.length), completed = 0;
            var getCb = function (i) {
                return function () {
                    resultArgs[i] = arguments;
                    completed++;
                    if(completed === ops.length) {
                        cb.apply(null, resultArgs);
                    }
                }
            };
            for(var i = 0, op; op = ops[i]; i++) {
                op(getCb(i));
            }
        }
        Async.sync = sync;
        var Task = (function () {
            function Task(ops, returnInArray) {
                if (typeof returnInArray === "undefined") { returnInArray = false; }
                if(returnInArray || ops.length > 1) {
                    this.op = function (cb) {
                        return sync(function () {
                            return cb.apply(null, arguments);
                        }, ops);
                    };
                } else {
                    if(ops.length === 1) {
                        this.op = ops[0];
                    } else {
                        this.op = function (cb) {
                            return cb();
                        };
                    }
                }
            }
            Task.prototype.next = function (getNextAsyncOps) {
                var _this = this;
                return new Task([
                    function (cb) {
                        return _this.op(function () {
                            var nextOps = getNextAsyncOps.apply(null, arguments);
                            if(nextOps instanceof Function) {
                                nextOps(cb);
                            } else {
                                if(nextOps instanceof Array) {
                                    sync(cb, nextOps);
                                } else {
                                    cb();
                                }
                            }
                        });
                    }                ]);
            };
            Task.prototype.done = function (cb) {
                this.op(cb);
            };
            return Task;
        })();
        Async.Task = Task;        
    })(Async || (Async = {}));
    function newTask() {
        var ops = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ops[_i] = arguments[_i + 0];
        }
        return new Async.Task(ops);
    }
    exports.newTask = newTask;
    function newTaskSeq(ops) {
        return new Async.Task(ops, true);
    }
    exports.newTaskSeq = newTaskSeq;
})
