define(["require", "exports", './filedb', './async'], function(require, exports, __fs__, __async__) {
    var fs = __fs__;

    var async = __async__;

    var test = {
        name: 'test.ts',
        type: 'text/plain; charset=UTF-8',
        location: '/',
        content: new ArrayBuffer(32),
        children: null
    };
    var env = {
        debug: true,
        log: function (text) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            if(this.debug) {
                args.unshift(text);
                console.log.apply(console, args);
            }
        }
    };
    async.newTask(function (cb) {
        return cb(fs.open({
            name: 'projectName',
            environment: env
        }));
    }).next(function (fileDb) {
        return function (cb) {
            return fileDb.put(test, function (_) {
                return cb(fileDb);
            });
        }
    }).next(function (fileDb) {
        return function (cb) {
            return fileDb.get('/test.ts', function (_) {
                return cb(fileDb);
            });
        }
    }).next(function (fileDb) {
        return function (cb) {
            return fileDb.del('/test.ts', function (_) {
                return cb(fileDb);
            });
        }
    }).done(function (fileDb) {
        console.log("ALL SYSTEMS ARE FUCK YES!!");
    });
    var solution = [
        {
            name: "Editor Interface",
            type: 'project',
            contents: [
                {
                    name: "Tree-View",
                    type: 'directory',
                    contents: [
                        {
                            name: 'file1',
                            type: 'file'
                        }, 
                        {
                            name: 'file2',
                            type: 'file'
                        }
                    ]
                }, 
                {
                    name: "file3",
                    type: 'file'
                }
            ]
        }, 
        {
            name: "TypeScript Compiler",
            type: 'project',
            contents: [
                {
                    name: "file4",
                    type: 'file'
                }, 
                {
                    name: "file5",
                    type: 'file'
                }
            ]
        }, 
        {
            name: 'Resources',
            type: 'directory',
            contents: [
                {
                    name: 'file6',
                    type: 'file'
                }, 
                {
                    name: 'file7',
                    type: 'file'
                }
            ]
        }
    ];
})

