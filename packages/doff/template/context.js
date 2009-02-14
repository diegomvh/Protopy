var ContextPopException = Class('ContextPopException', Exception);

var Context = Class('Context', {
    __doc__: 'Context for the template rendering\npush the context, pop the context, get elements and set elements',
    __init__: function(_dict, autoescape) {
        _dict = _dict || {};
        this.dicts = [_dict];
        this.autoescape = autoescape || true;
    },

    push: function() {
        var _dict = {};
        this.dicts = [_dict].concat(this.dicts);
        return _dict;
    },

    pop: function() {
        if (this.dicts.length == 1)
            throw new ContextPopException('no more');
        return this.dicts.shift();
    },

    get: function(key, otherwise) {
        var _dict = null;
        for (var i = 0; _dict = this.dicts[i]; i++)
            if (key in _dict)
                return _dict[key];
        if (otherwise)
            return otherwise;
        throw new KeyError(key);
    },

    set: function(key, value){
        this.dicts[0][key] = value;
    },

    has_key: function(key){
        var _dict = null;
        for (var i = 0; _dict = this.dicts[i]; i++)
            if (key in _dict)
                return true;
        return false;
    },

    update: function(_dict) {
        if (typeof _dict != "object")
            throw new TypeError('other_dict must be a mapping (dictionary-like) object.');
        this.dicts = [_dict].concat(this.dicts);
        return _dict;
     }
});

$P({ 'Context': Context });
