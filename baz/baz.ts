import fs = module('./filedb');
import async = module('./async');
import ui = module('./tree-view');

var bazSolution : IFileData = {
    name: 'baz.sln',
    type: 'application/vnd.baz.solution',
    location: '/',
    content: null,
    children: null
}

var bazProject : IFileData = {
    name: 'baz.tsp',
    type: 'application/vnd.baz.project',
    location : '/baz.sln',
    content: null,
    children: null
}

var bazTS : IFileData = {
    name: 'baz.ts',
    type: 'text/vnd.ms-typescript',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var bazJS : IFileData = {
    name: 'baz.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.proj/baz.ts',
    content: null,
    children: null
}

var bazCSS : IFileData = {
    name: 'baz.css',
    type: 'text/css',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var aceDir : IFileData = {
    name: 'ace',
    type: 'application/vnd.baz.directory',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var aceJS : IFileData = {
    name: 'ace.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.tsp/ace',
    content: null,
    children: null
}
var aceLong : IFileData = {
    name: 'long ass filename right here homie.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.tsp/ace',
    content: null,
    children: null
}

var compilerProject : IFileData = {
    name: 'typescript-compiler.tsp',
    type: 'application/vnd.baz.project',
    location: '/baz.sln',
    content: null,
    children: null
}

var tscTS : IFileData = {
    name: 'tsc.ts',
    type: 'text/vnd.ms-typescript',
    location: '/baz.sln/typescript-compiler.tsp',
    content: null,
    children: null
}


var libTS : IFileData = {
    name: 'lib.d.ts',
    type: 'text/vnd.ms-typescript',
    location: '/baz.sln/typescript-compiler.tsp',
    content: null,
    children: null
}

var env = {
    debug : true,
    log: function(text: string, ...args: any[]) : void {
        if (this.debug) {
            args.unshift(text);
            console.log.apply(console, args);
        }
    }
}

async.newTask(cb => cb(fs.open({ name: 'baz', environment: env })))
    .next((fs : IFileDb) => cb => fs.save(bazSolution,       () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(bazProject,        () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(bazTS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(bazJS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(bazCSS,            () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(aceDir,            () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(aceJS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(aceLong,           () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(compilerProject,   () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(tscTS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.save(libTS,             () => cb(fs)))
    .done((fs : IFileDb) => {
        (<any> window).tree = new ui.FSTreeView({
            db          : fs,
            environment : env,
            path        : '/baz.sln',
            parentSel   : '#solution-explorer'
        });
        (<any> window).fs = fs;
    });