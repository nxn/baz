define(["require", "exports"], function(require, exports) {
    (function (Guid) {
        function make() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0;
                var v = c == 'x' ? r : (r & 3 | 8);

                return v.toString(16);
            });
        }
        Guid.make = make;
    })(exports.Guid || (exports.Guid = {}));

})

