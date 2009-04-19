$L('doff.core.project', 'get_settings', 'get_project');

var settings = get_settings();
var project = get_project();

var ContextPopException = type('ContextPopException', Exception);

var Context = type('Context', {
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

$D(Context, 'Context for the template rendering\npush the context, pop the context, get elements and set elements');

// This is a function rather than module-level procedural code because we only want it to execute if somebody uses RequestContext.
function get_standard_processors() {
    var standard_context_processors = project._standard_context_processors;
    if (!standard_context_processors) {
        var processors = [];
        for each (var path in settings.TEMPLATE_CONTEXT_PROCESSORS) {
            var i = path.lastIndexOf('.');
            var module = path.substring(0, i);
            var attr = path.substring(i + 1 , path.length);
            try {
                var mod = $L(module);
            } catch (e) {
                throw new ImproperlyConfigured('Error importing request processor module %s: "%s"'.subs(module, e));
            }
            try {
                var func = getattr(mod, attr);
            } catch (e if isinstance(e, AttributeError)) {
                throw new ImproperlyConfigured('Module "%s" does not define a "%s" callable request processor'.subs(module, attr));
            }
            processors.push(func);
            standard_context_processors = project._standard_context_processors = processors;
        }
    }
    return standard_context_processors;
}

var RequestContext = type('RequestContext', [Context], {
    /*
    This subclass of template.Context automatically populates itself using
    the processors defined in TEMPLATE_CONTEXT_PROCESSORS.
    Additional processors can be specified as a list of callables
    using the "processors" keyword argument.
    */ 
    __init__: function __init__(request, dict, processors) {
        super(Context, this).__init__(dict);
        if (!processors)
            processors = [];
        else
            processors = array(processors);
        for each (var processor in get_standard_processors().concat(processors))
            this.update(processor(request));
    }
});

$P({ 
    'Context': Context,
    'RequestContext': RequestContext
});
