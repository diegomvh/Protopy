$L('doff.core.project', 'get_settings', 'get_project');

var settings = get_settings();
var project = get_project();

var ContextPopException = type('ContextPopException', Exception);

/* defo:translate
 *
 */
var Context = type('Context', {
    __doc__: 'Context for the template rendering\npush the context, pop the context, get elements and set elements',
    __init__: function(_dict, autoescape) {
        _dict = _dict || {};
        this._dicts = [_dict];
        //FIXME: ver que hacemos con los escapeados de cadena
        this.autoescape = autoescape || true;
    },

    __getitem__: function(key) {
        var _dict = null;
        for (var i = 0; _dict = this._dicts[i]; i++)
            if (key in _dict)
                return _dict[key];
        throw new KeyError(key);
    },

    push: function() {
        var _dict = {};
        this._dicts = [_dict].concat(this._dicts);
        return _dict;
    },

    pop: function() {
        if (this._dicts.length == 1)
            throw new ContextPopException('The context is empty');
        return this._dicts.shift();
    },

    get: function(key, otherwise) {
        var _dict = null;
        for each (var _dict in this._dicts)
            if (key in _dict)
                return _dict[key];
        if (otherwise)
            return otherwise;
        throw new KeyError(key);
    },

    set: function(key, value){
        this._dicts[0][key] = value;
    },

    has_key: function(key){
        var _dict = null;
        for each (var _dict in this._dicts)
            if (key in _dict)
                return true;
        return false;
    },

    update: function(_dict) {
        if (!isinstance(_dict, Object))
            throw new TypeError('Other_dict must be a mapping (dictionary-like) object.');
        this._dicts = [_dict].concat(this._dicts);
        return _dict;
     }
});

/*
 * This is a function rather than module-level procedural code because we only want it to execute if somebody uses RequestContext.
 */
var standard_context_processors = null;

function get_standard_processors() {
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
            standard_context_processors = processors;
        }
    }
    return standard_context_processors;
}

/*
 * This subclass of template.Context automatically populates itself using the processors defined in TEMPLATE_CONTEXT_PROCESSORS.
 * Additional processors can be specified as a list of callables using the "processors" keyword argument.
 */ 
var RequestContext = type('RequestContext', [Context], {
    __init__: function(request, dict, processors) {
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
    Context: Context,
    RequestContext: RequestContext
});
