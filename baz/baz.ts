import fs = module('./filedb');
import async = module('./async');
//import ui    = module('./tree-view');

declare var $;

var test = {
    name: 'test.ts',
    type: 'text/plain; charset=UTF-8',
    location: '/',
    content: new ArrayBuffer(32)
};

var env = {
    debug : true,
    log: function(text: string, ...args: any[]) : void {
        if (this.debug) {
            args.unshift(text);
            console.log.apply(console, args);
        }
    }
}

async.newTask(cb => cb(fs.open({ name: 'projectName', environment: env })))
    .next((fileDb : fs.IFileDb) => cb => fileDb.put(test,       _ => cb(fileDb)))
    .next((fileDb : fs.IFileDb) => cb => fileDb.get('/test.ts', _ => cb(fileDb)))
    .next((fileDb : fs.IFileDb) => cb => fileDb.del('/test.ts', _ => cb(fileDb)))
    .done((fileDb : fs.IFileDb) => {
        console.log("ALL SYSTEMS ARE FUCK YES!!");
    });

var solution =
    [ { name: "Editor Interface"
        , type: 'project'
        , contents:
            [ { name: "Tree-View"
            , type: 'directory'
            , contents: 
                [ { name: 'file1', type: 'file' }
                , { name: 'file2', type: 'file' }
                ] 
            }
            , { name: "file3", type: 'file' }
            ]
        }
    , { name: "TypeScript Compiler"
        , type: 'project'
        , contents:
            [ { name: "file4", type: 'file' }
            , { name: "file5", type: 'file' }
            ]
        }
    , { name: 'Resources'
        , type: 'directory'
        , contents:
            [ { name: 'file6', type: 'file' }
            , { name: 'file7', type: 'file' }
            ]
        }
    ]

//var tree = new ui.TreeView(
//    { data: solution
//    , parentSel: '#solution-explorer'
//    , templateSel: '#tpl-tree-view'
//    , indentAmount: 20
//    }
//);
//$(() => tree.render());