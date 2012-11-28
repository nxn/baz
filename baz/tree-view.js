define(["require", "exports", "./async", "./guid"], function(require, exports, __async__, __g__) {
    var async = __async__;

    var g = __g__;

    var FSTreeNode = (function () {
        function FSTreeNode(file, parent, db, environment, tree) {
            this.isOpen = false;
            this.id = g.Guid.generate().value;
            this.file = file;
            this.isOpen = false;
            this.nodes = [];
            if(parent instanceof jQuery) {
                this.parent = null;
                this.indent = 0;
                this._$parent = parent;
            } else {
                this.parent = parent;
                this.indent = parent.indent + 1;
                this._$parent = $(parent.domElement).children('.content');
            }
            this._db = db;
            this._env = environment;
            this._tree = tree;
        }
        FSTreeNode._EFFECT_DURATION = 100;
        FSTreeNode._NOOP = function () {
        };
        FSTreeNode._TYPE_ORDER = (function () {
            var order = {
            };
            order["application/vnd.baz.solution"] = 1;
            order["application/vnd.baz.project"] = 2;
            order["application/vnd.baz.directory"] = 3;
            return order;
        })();
        FSTreeNode.prototype._getMimeClass = function () {
            return this.file.type.replace(/[\.\/]/g, '-');
        };
        FSTreeNode.prototype._dragStart = function (e) {
            e.stopImmediatePropagation();
            e.dataTransfer.setData('text/plain', this.file.absolutePath);
            this._tree.dragSourceNode = this;
        };
        FSTreeNode.prototype._dragEnd = function (e) {
            this._tree.dragSourceNode = null;
        };
        FSTreeNode.prototype._dragOver = function (e) {
            e.stopImmediatePropagation();
            var source = this._tree.dragSourceNode;
            if(source === this || this === this._tree.root) {
                return;
            }
            e.preventDefault();
            this._$this.addClass('drag-hover');
            return false;
        };
        FSTreeNode.prototype._dragLeave = function (e) {
            this._$this.removeClass('drag-hover');
        };
        FSTreeNode.prototype._dragDrop = function (e) {
            e.stopImmediatePropagation();
            e.preventDefault();
            this._$this.removeClass('drag-hover');
            var sourcePath = e.dataTransfer.getData('text/plain'), sourceNode = this._tree.dragSourceNode;
            if(sourceNode.file.absolutePath !== sourcePath) {
                return false;
            }
            sourceNode.move(this);
        };
        Object.defineProperty(FSTreeNode.prototype, "domElement", {
            get: function () {
                return this._$this.get();
            },
            set: function (value) {
                this._$this = $(value);
            },
            enumerable: true,
            configurable: true
        });
        FSTreeNode.prototype.render = function () {
            var _this = this;
            if(!this._$this) {
                this._$this = $('<div/>').appendTo(this._$parent);
            }
            this._$this.addClass('node').attr('id', this.id).attr('draggable', 'true').bind('dragstart', function (e) {
                return _this._dragStart(e.originalEvent);
            }).bind('dragover', function (e) {
                return _this._dragOver(e.originalEvent);
            }).bind('dragleave', function (e) {
                return _this._dragLeave(e.originalEvent);
            }).bind('drop', function (e) {
                return _this._dragDrop(e.originalEvent);
            }).bind('dragend', function (e) {
                return _this._dragEnd(e.originalEvent);
            });
            var $itemContainer = $('<div/>').addClass('item-container').appendTo(this._$this).css('padding-left', (this._tree.indentAmount * this.indent) + 'px').hover(function () {
                return _this._tree.fireNodeMouseIn(_this);
            }, function () {
                return _this._tree.fireNodeMouseOut(_this);
            });
            var $item = $('<div/>').appendTo($itemContainer).addClass('item ' + this._getMimeClass());
            this._$collapseSwitch = $('<div/>').hide().appendTo($item).addClass('collapse-switch').click(function (_) {
                return _this.toggle();
            });
            if(this.file.childCount > 0) {
                this._$collapseSwitch.show();
            }
            var $icon = $('<div/>').appendTo($item).addClass('icon');
            var $name = $('<div/>').appendTo($item).addClass('name').text(this.file.name);
            var $actions = $('<div/>').appendTo($item).addClass('actions');
            var $refresh = $('<div/>').appendTo($actions).addClass('refresh').click(function (_) {
                return _this.refresh();
            });
            var $add = $('<div/>').appendTo($actions).addClass('add');
            var $remove = $('<div/>').appendTo($actions).addClass('remove');
            var $contents = $('<div/>').appendTo(this._$this).addClass('content');
            if(this.nodes) {
                for(var i = 0, node; node = this.nodes[i]; i++) {
                    node.render();
                }
            }
        };
        FSTreeNode.prototype.toggle = function (cb) {
            if(this.isOpen) {
                this.close(cb);
            } else {
                this.open(cb);
            }
        };
        FSTreeNode.prototype.open = function (cb) {
            var _this = this;
            this._$this.addClass('open');
            this.isOpen = true;
            var $content = this._$this.children('.content').hide();
            this.refresh(function () {
                $content.slideDown(FSTreeNode._EFFECT_DURATION, function () {
                    _this._tree.fireTreeChange(_this);
                    cb && cb();
                });
            });
        };
        FSTreeNode.prototype.close = function (cb) {
            var _this = this;
            this._$this.removeClass('open');
            this.isOpen = false;
            var $content = this._$this.children('.content');
            $content.slideUp(FSTreeNode._EFFECT_DURATION, function () {
                $content.empty();
                _this.nodes = [];
                _this._tree.fireTreeChange(_this);
                cb && cb();
            });
        };
        FSTreeNode.prototype.refresh = function (cb) {
            var _this = this;
            this._$this.children('.content').empty();
            var absolutePath = this.file.absolutePath;
            async.newTask(function (cb) {
                return _this._db.getFileNode(absolutePath, cb);
            }).next(function (response) {
                if(!response.success) {
                    _this._env.log('Error refreshing "%s"', absolutePath);
                    return;
                }
                _this.file = response.result;
                var i = 0, asyncOps = new Array(_this.file.childCount);
                _this.file.forEachChild(function (child) {
                    asyncOps[i++] = (function (cb) {
                        return _this._db.getFileNode(_this._db.utils.getAbsolutePath({
                            name: child.name,
                            location: _this.file.absolutePath
                        }), cb);
                    });
                });
                return function (cb) {
                    return async.newTaskSeq(asyncOps).done(cb);
                }
            }).done(function () {
                var argArray = [];
                for (var _i = 0; _i < (arguments.length - 0); _i++) {
                    argArray[_i] = arguments[_i + 0];
                }
                var response;
                var nodes = new Array(_this.file.childCount);
                for(var i = 0, args; args = argArray[i]; i++) {
                    response = args[0];
                    if(!response.success) {
                        _this._env.log('FAILURE: Could not open child of "%s".', _this.file.absolutePath);
                    }
                    nodes[i] = new FSTreeNode(response.result, _this, _this._db, _this._env, _this._tree);
                }
                _this.nodes = nodes.sort(function (a, b) {
                    return _this._compareFn(a, b);
                });
                for(var i = 0, node; node = _this.nodes[i]; i++) {
                    node.render();
                }
                if(_this.nodes.length > 0) {
                    _this._$collapseSwitch.show();
                } else {
                    _this._$collapseSwitch.hide();
                }
                cb && cb();
            });
        };
        FSTreeNode.prototype.add = function (node) {
            this._$collapseSwitch.show();
            if(!this.isOpen) {
                this.open();
                return;
            }
            var idx = this._find(node, 0, this.nodes.length - 1, true);
            if(this.nodes.length === idx) {
                this.nodes.push(node);
            } else {
                node.domElement = $('<div/>').insertBefore(this.nodes[idx].domElement).get();
                this.nodes.splice(idx, 0, node);
            }
            node.render();
            this._tree.fireTreeChange(this);
            return node;
        };
        FSTreeNode.prototype.remove = function (node) {
            var idx = this._find(node, 0, this.nodes.length - 1);
            if(idx < 0) {
                idx = this.nodes.indexOf(node);
            }
            var n = this.nodes[idx];
            if(node.file.absolutePath !== n.file.absolutePath) {
                return;
            }
            this.nodes.splice(idx, 1);
            if(this.nodes.length < 1) {
                this._$collapseSwitch.hide();
                this.isOpen = false;
                this._$this.removeClass('open');
            }
            this._$this.find('#' + n.id).remove();
            this._tree.fireTreeChange(this);
        };
        FSTreeNode.prototype.copy = function (destination, cb) {
            var _this = this;
            if(destination === this.parent) {
                return;
            }
            var copyView = function (response) {
                if(!response.success) {
                    return;
                }
                var node = destination.add(new FSTreeNode(response.result, destination, _this._db, _this._env, _this._tree));
                cb && cb(node);
            };
            this._db.cp(this.file.absolutePath, this._db.utils.normalizePath(destination.file.absolutePath + '/' + this.file.name), copyView);
        };
        FSTreeNode.prototype.move = function (destination, cb) {
            var _this = this;
            if(destination === this.parent) {
                return;
            }
            var moveView = function (response) {
                if(!response.success) {
                    return;
                }
                var node = destination.add(new FSTreeNode(response.result, destination, _this._db, _this._env, _this._tree));
                _this.parent.remove(_this);
                cb && cb(node);
            };
            this._db.mv(this.file.absolutePath, this._db.utils.normalizePath(destination.file.absolutePath + '/' + this.file.name), moveView);
        };
        FSTreeNode.prototype._find = function (node, start, end, returnInsertionIndex) {
            if (typeof returnInsertionIndex === "undefined") { returnInsertionIndex = false; }
            if(start > end) {
                return returnInsertionIndex ? start : -1;
            }
            var middle = (start + (end - start) / 2) | 0, result = this._compareFn(node, this.nodes[middle]);
            if(result < 0) {
                return this._find(node, start, middle - 1, returnInsertionIndex);
            } else {
                if(result > 0) {
                    return this._find(node, middle + 1, end, returnInsertionIndex);
                } else {
                    return middle;
                }
            }
        };
        FSTreeNode.prototype._compareType = function (a, b) {
            var aType = a.file.type, bType = b.file.type, aPriority = FSTreeNode._TYPE_ORDER[aType], bPriority = FSTreeNode._TYPE_ORDER[bType], aPriorityUndefined = typeof aPriority === 'undefined', bPriorityUndefined = typeof bPriority === 'undefined';
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
            if(a.file.name === b.file.name) {
                return 0;
            }
            return a.file.name > b.file.name ? 1 : -1;
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
    var FSTreeView = (function () {
        function FSTreeView(config) {
            var _this = this;
            this.indentAmount = config.indentAmount || 20;
            this._db = config.db;
            this._path = config.path || '/';
            this._env = config.environment || FSTreeView._DEFAULT_ENV;
            this._parentSel = config.parentSel;
            this._treeChangeHandlers = [];
            this._nodeMouseInHandlers = [];
            this._nodeMouseOutHandlers = [];
            this._nodeSelectHandlers = [];
            $(function () {
                _this.render();
                _this._openRoot();
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
        FSTreeView.prototype.render = function () {
            if(!this._$this) {
                this._$this = $('<div/>').addClass('tree-view').appendTo(this._parentSel);
            }
        };
        FSTreeView.prototype._openRoot = function () {
            var _this = this;
            async.newTask(function (cb) {
                return _this._db.getFileNode(_this._path, cb);
            }).done(function (response) {
                if(!response.success) {
                    _this._env.log("Failed to open FS root (tree-view.ts:FSTreeView:constructor)");
                }
                _this.root = new FSTreeNode(response.result, _this._$this, _this._db, _this._env, _this);
                _this.root.render();
                _this.root.open();
            });
        };
        FSTreeView.prototype.traverse = function (fn) {
            this._traverse(this.root, fn);
        };
        FSTreeView.prototype._traverse = function (startNode, fn) {
            if(!fn(startNode) || !startNode.isOpen || !startNode.nodes) {
                return;
            }
            for(var i = 0, node; node = startNode.nodes[i]; i++) {
                this._traverse(node, fn);
            }
        };
        FSTreeView.prototype.fireTreeChange = function (sender) {
            for(var i = 0, handler; handler = this._treeChangeHandlers[i]; i++) {
                handler(sender);
            }
        };
        FSTreeView.prototype.fireNodeSelect = function (sender) {
            for(var i = 0, handler; handler = this._nodeSelectHandlers[i]; i++) {
                handler(sender);
            }
        };
        FSTreeView.prototype.fireNodeMouseIn = function (sender) {
            for(var i = 0, handler; handler = this._nodeMouseInHandlers[i]; i++) {
                handler(sender);
            }
        };
        FSTreeView.prototype.fireNodeMouseOut = function (sender) {
            for(var i = 0, handler; handler = this._nodeMouseOutHandlers[i]; i++) {
                handler(sender);
            }
        };
        FSTreeView.prototype.onTreeChange = function (handler) {
            this._treeChangeHandlers.push(handler);
        };
        FSTreeView.prototype.onNodeHover = function (mouseIn, mouseOut) {
            this._nodeMouseInHandlers.push(mouseIn);
            this._nodeMouseOutHandlers.push(mouseOut);
        };
        FSTreeView.prototype.onNodeSelect = function (handler) {
            this._nodeSelectHandlers.push(handler);
        };
        return FSTreeView;
    })();
    exports.FSTreeView = FSTreeView;    
})
