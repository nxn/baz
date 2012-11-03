define(["require", "exports", './filedb', './async', './tree-view'], function(require, exports, __fs__, __async__, __ui__) {
    var fs = __fs__;

    var async = __async__;

    var ui = __ui__;

    var bazSolution = {
        name: 'baz.sln',
        type: 'application/vnd.baz.solution',
        location: '/',
        content: null,
        children: null
    };
    var bazProject = {
        name: 'baz.tsp',
        type: 'application/vnd.baz.project',
        location: '/baz.sln',
        content: null,
        children: null
    };
    var bazTS = {
        name: 'baz.ts',
        type: 'text/vnd.ms-typescript',
        location: '/baz.sln/baz.tsp',
        content: null,
        children: null
    };
    var bazJS = {
        name: 'baz.js',
        type: 'text/javascript',
        location: '/baz.sln/baz.proj/baz.ts',
        content: null,
        children: null
    };
    var bazCSS = {
        name: 'baz.css',
        type: 'text/css',
        location: '/baz.sln/baz.tsp',
        content: null,
        children: null
    };
    var compilerProject = {
        name: 'typescript-compiler.tsp',
        type: 'application/vnd.baz.project',
        location: '/baz.sln',
        content: null,
        children: null
    };
    var tscTS = {
        name: 'tsc.ts',
        type: 'text/vnd.ms-typescript',
        location: '/baz.sln/typescript-compiler.tsp',
        content: null,
        children: null
    };
    var libTS = {
        name: 'lib.d.ts',
        type: 'text/vnd.ms-typescript',
        location: '/baz.sln/typescript-compiler.tsp',
        content: null,
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
            name: 'baz',
            environment: env
        }));
    }).next(function (fs) {
        return function (cb) {
            return fs.put(bazSolution, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(bazProject, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(bazTS, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(bazJS, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(bazCSS, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(compilerProject, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(tscTS, function () {
                return cb(fs);
            });
        }
    }).next(function (fs) {
        return function (cb) {
            return fs.put(libTS, function () {
                return cb(fs);
            });
        }
    }).done(function (fs) {
        return new ui.FSTreeView({
            db: fs,
            environment: env,
            path: '/baz.sln',
            parentSel: '#solution-explorer'
        });
    });
})

