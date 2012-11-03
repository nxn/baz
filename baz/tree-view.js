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
            this._render();
        }
        FSTreeNode.prototype._getMimeClass = function () {
            return this._file.type.replace(/[\.\/]/g, '-');
        };
        FSTreeNode.prototype._render = function () {
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
            var $add = $('<div/>').appendTo($actions).addClass('add');
            var $remove = $('<div/>').appendTo($actions).addClass('remove');
            var $contents = $('<div/>').appendTo(this._$this).addClass('content');
        };
        FSTreeNode.prototype.toggle = function () {
            if(this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        };
        FSTreeNode.prototype.close = function () {
            this._$this.children('.content').empty();
            this._$this.removeClass('open');
            this.isOpen = false;
        };
        FSTreeNode.prototype.open = function () {
            var _this = this;
            this._$this.children('.content').empty();
            this._file.forEachChild(function (child) {
                async.newTask(function (cb) {
                    return _this._db.get(_this._db.utils.getAbsolutePath({
                        name: child.name,
                        location: _this._file.absolutePath
                    }), cb);
                }).done(function (response) {
                    if(!response.success) {
                        _this._env.log('FAILURE: Could not open child of "%s".', _this._file.absolutePath);
                    }
                    var node = new FSTreeNode(response.result, _this._$this.children('.content'), _this._db, _this._env);
                    _this.nodes.push(node);
                    _this._$this.addClass('open');
                    _this.isOpen = true;
                });
            });
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

