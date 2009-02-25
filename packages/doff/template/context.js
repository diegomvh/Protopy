var ContextPopException = type('ContextPopException', Exception);

var Context = type('Context', {
    __doc__: 'Context for the template rendering\npush the context, pop the context, get elements and set elements',
    '__init__': function __init__(_dict, autoescape) {
        _dict = _dict || {};
        this.dicts = [_dict];
        this.autoescape = autoescape || true;
    },

    '__getitem__': function __getitem__(key) {
        var _dict = null;
        for (var i = 0; _dict = this.dicts[i]; i++)
            if (key in _dict)
                return _dict[key];
        throw new KeyError(key);
    },

    'push': function push() {
        var _dict = {};
        this.dicts = [_dict].concat(this.dicts);
        return _dict;
    },

    'pop': function pop() {
        if (this.dicts.length == 1)
            throw new ContextPopException('no more');
        return this.dicts.shift();
    },

    'get': function get(key, otherwise) {
        var _dict = null;
        for (var i = 0; _dict = this.dicts[i]; i++)
            if (key in _dict)
                return _dict[key];
        if (otherwise)
            return otherwise;
        throw new KeyError(key);
    },

    'set': function set(key, value){
        this.dicts[0][key] = value;
    },

    'has_key': function has_key(key){
        var _dict = null;
        for (var i = 0; _dict = this.dicts[i]; i++)
            if (key in _dict)
                return true;
        return false;
    },

    'update': function update(_dict) {
        if (typeof _dict != "object")
            throw new TypeError('other_dict must be a mapping (dictionary-like) object.');
        this.dicts = [_dict].concat(this.dicts);
        return _dict;
     }
});

$P({ 'Context': Context });
