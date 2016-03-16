
//import fs = module('./filedb');
//import async = module('./async');
//import ui = module('./tree-view');


import * as fs from "./filedb";
import * as async from "./async";
import * as ui from "./tree-view";



var bazSolution : IFileNodeData = {
    name: 'baz.sln',
    type: 'application/vnd.baz.solution',
    location: '/',
    content: null,
    children: null
}

var bazProject: IFileNodeData = {
    name: 'baz.tsp',
    type: 'application/vnd.baz.project',
    location : '/baz.sln',
    content: null,
    children: null
}

var bazTS : IFileNodeData = {
    name: 'baz.ts',
    type: 'text/vnd.ms-typescript',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var bazJS : IFileNodeData = {
    name: 'baz.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.tsp/baz.ts',
    content: null,
    children: null
}

var bazCSS : IFileNodeData = {
    name: 'baz.css',
    type: 'text/css',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var aceDir : IFileNodeData = {
    name: 'ace',
    type: 'application/vnd.baz.directory',
    location: '/baz.sln/baz.tsp',
    content: null,
    children: null
}

var aceJS : IFileNodeData = {
    name: 'ace.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.tsp/ace',
    content: null,
    children: null
}
var aceLong : IFileNodeData = {
    name: 'long ass filename right here homie.js',
    type: 'text/javascript',
    location: '/baz.sln/baz.tsp/ace',
    content: null,
    children: null
}

var compilerProject : IFileNodeData = {
    name: 'typescript-compiler.tsp',
    type: 'application/vnd.baz.project',
    location: '/baz.sln',
    content: null,
    children: null
}

var tscTS : IFileNodeData = {
    name: 'tsc.ts',
    type: 'text/vnd.ms-typescript',
    location: '/baz.sln/typescript-compiler.tsp',
    content: null,
    children: null
}


var libTS : IFileNodeData = {
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
    .next((fs : IFileDb) => cb => fs.putFileNode(bazSolution,       () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(bazProject,        () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(bazTS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(bazJS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(bazCSS,            () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(aceDir,            () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(aceJS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(aceLong,           () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(compilerProject,   () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(tscTS,             () => cb(fs)))
    .next((fs : IFileDb) => cb => fs.putFileNode(libTS,             () => cb(fs)))
    .done((fs : IFileDb) => {
        (<any> window).tree = new ui.FSTreeView({
            db          : fs,
            environment : env,
            path        : '/baz.sln',
            parentSel   : '#solution-explorer'
        });
        (<any> window).fs = fs;
    });