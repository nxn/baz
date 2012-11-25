define(["require", "exports"], function(require, exports) {
    var Guid = (function () {
        function Guid(guid) {
            this._value = guid;
        }
        Guid.generate = function generate() {
            return new Guid('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 3 | 8);
                return v.toString(16);
            }));
        }
        Object.defineProperty(Guid.prototype, "value", {
            get: function () {
                return this._value;
            },
            enumerable: true,
            configurable: true
        });
        return Guid;
    })();
    exports.Guid = Guid;    
})
