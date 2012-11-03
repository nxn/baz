define(["require", "exports", "./async", "./utils"], function(require, exports, __async__, __utils__) {
    var async = __async__;

    var utils = __utils__;

    var FSTreeNode = (function () {
        function FSTreeNode(file, $parent, db, environment) {
            this._db = db;
            this._env = environment;
            this._file = file;
            this._$parent = $parent;
            this.id = utils.Guid.make();
            this.nodes = [];
            this.isOpen = false;
        }
        FSTreeNode._EFFECT_DURATION = 100;
        FSTreeNode._NOOP = function () {
        };
        FSTreeNode._TYPE_ORDER = (function () {
            var order = {
            };
            order["application/vnd.baz.solution"] = 1;
            order["application/vnd.baz.project"] = 2;
            order["applicatoin/vnd.baz.directory"] = 3;
            return order;
        })();
        FSTreeNode.prototype._getMimeClass = function () {
            return this._file.type.replace(/[\.\/]/g, '-');
        };
        FSTreeNode.prototype.render = function () {
            var _this = this;
            if(!this._$this) {
                this._$this = $('<div/>').appendTo(this._$parent).addClass('node');
            }
            var $file = $('<div/>').appendTo(this._$this).addClass(this._getMimeClass() + " item");
            var $toggleWrapper = $('<div/>').appendTo($file).addClass('toggle-content-view');
            if(this._file.childCount > 0) {
                $('<div/>').appendTo($toggleWrapper).addClass('btn').click(function (_) {
                    return _this.toggle();
                });
            }
            var $icon = $('<div/>').appendTo($file).addClass('icon');
            var $name = $('<div/>').appendTo($file).addClass('name').text(this._file.name);
            var $actions = $('<div/>').appendTo($file).addClass('actions');
            var $refresh = $('<div/>').appendTo($actions).addClass('refresh').click(function (_) {
                return _this.refresh();
            });
            var $add = $('<div/>').appendTo($actions).addClass('add');
            var $remove = $('<div/>').appendTo($actions).addClass('remove');
            var $contents = $('<div/>').appendTo(this._$this).addClass('content');
        };
        FSTreeNode.prototype.toggle = function (cb) {
            if(this.isOpen) {
                this.close(cb);
            } else {
                this.open(cb);
            }
        };
        FSTreeNode.prototype.open = function (cb) {
            this._$this.addClass('open');
            this.isOpen = true;
            var $content = this._$this.children('.content').hide();
            this.refresh(function () {
                return $content.slideDown(FSTreeNode._EFFECT_DURATION, cb);
            });
        };
        FSTreeNode.prototype.close = function (cb) {
            this._$this.removeClass('open');
            this.isOpen = false;
            var $content = this._$this.children('.content');
            $content.slideUp(FSTreeNode._EFFECT_DURATION, function () {
                $content.empty();
                cb && cb();
            });
        };
        FSTreeNode.prototype.refresh = function (cb) {
            var _this = this;
            if(!this.isOpen) {
                return;
            }
            this._$this.children('.content').empty();
            var i = 0;
            var asyncOps = new Array(this._file.childCount);

            this._file.forEachChild(function (child) {
                asyncOps[i++] = (function (cb) {
                    return _this._db.get(_this._db.utils.getAbsolutePath({
                        name: child.name,
                        location: _this._file.absolutePath
                    }), cb);
                });
            });
            async.newTaskSeq(asyncOps).done(function () {
                var argArray = [];
                for (var _i = 0; _i < (arguments.length - 0); _i++) {
                    argArray[_i] = arguments[_i + 0];
                }
                var response;
                var nodes = new Array(_this._file.childCount);
                for(var i = 0, args; args = argArray[i]; i++) {
                    response = args[0];
                    if(!response.success) {
                        _this._env.log('FAILURE: Could not open child of "%s".', _this._file.absolutePath);
                    }
                    nodes[i] = new FSTreeNode(response.result, _this._$this.children('.content'), _this._db, _this._env);
                }
                _this.nodes = nodes.sort(function (a, b) {
                    return _this._compareFn(a, b);
                });
                for(var i = 0, node; node = _this.nodes[i]; i++) {
                    node.render();
                }
                cb && cb();
            });
        };
        FSTreeNode.prototype._compareType = function (a, b) {
            var aType = a._file.type;
            var bType = b._file.type;
            var aPriority = FSTreeNode._TYPE_ORDER[aType];
            var bPriority = FSTreeNode._TYPE_ORDER[bType];
            var aPriorityUndefined = typeof aPriority === 'undefined';
            var bPriorityUndefined = typeof bPriority === 'undefined';

            if(aPriorityUndefined && bPriorityUndefined) {
                return 0;
            }
            if(aPriorityUndefined) {
                return 1;
            }
            if(bPriorityUndefined) {
                return -1;
            }
            if(aPriority === bPriority) {
                return 0;
            }
            ; ;
            return aPriority > bPriority ? 1 : -1;
        };
        FSTreeNode.prototype._compareName = function (a, b) {
            return a._file.name > b._file.name ? 1 : -1;
        };
        FSTreeNode.prototype._compareFn = function (a, b) {
            var type = this._compareType(a, b);
            if(type != 0) {
                return type;
            }
            return this._compareName(a, b);
        };
        return FSTreeNode;
    })();    
    var FSTreeViewBGLayer = (function () {
        function FSTreeViewBGLayer() { }
        return FSTreeViewBGLayer;
    })();    
    var FSTreeView = (function () {
        function FSTreeView(config) {
            var _this = this;
            this._db = config.db;
            this._path = config.path || '/';
            this._env = config.environment || FSTreeView._DEFAULT_ENV;
            this._parentSel = config.parentSel;
            this._bg = new FSTreeViewBGLayer();
            async.newTask(function (cb) {
                return _this._db.get(_this._path, cb);
            }, function (cb) {
                return $(cb);
            }).done(function (dbResponseArgs, domReadyArgs) {
                var response = dbResponseArgs[0];
                if(!response.success) {
                    _this._env.log("Failed to open FS root (tree-view.ts:FSTreeView:constructor)");
                }
                _this._root = new FSTreeNode(response.result, $(_this._parentSel), _this._db, _this._env);
                _this._root.render();
                _this._root.open();
            });
        }
        FSTreeView._DEFAULT_ENV = {
            log: function (any) {
                var args = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    args[_i] = arguments[_i + 1];
                }
            }
        };
        return FSTreeView;
    })();
    exports.FSTreeView = FSTreeView;    
})

