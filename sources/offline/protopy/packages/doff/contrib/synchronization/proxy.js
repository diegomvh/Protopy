/* "doff.contrib.synchronization.proxy" */
require('event');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.core.project', 'get_project');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var jsonrpc = get_project().jsonrpc;

var JavaScriptSerializer = require('doff.core.serializers.javascript', 'Serializer');
var JavaScriptDeserializer = require('doff.core.serializers.javascript', 'Deserializer');
require('json');

function ensure_default_proxy(cls) {
    require('doff.contrib.synchronization.models', 'SyncModel');
    if (!cls._meta['abstract'] && issubclass(cls, SyncModel)) {
        try {
            var f = cls._meta.get_field('remotes');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if isinstance(e, FieldDoesNotExist)) {}
        cls.add_to_class('remotes', new Proxy(jsonrpc));
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_proxy);

//Convert a queryset to JSON.
var Serializer = type('Serializer', [ JavaScriptSerializer ], {
    internal_use_only: false,

    end_serialization: function() {
        delete this.options['stream'];
        delete this.options['fields'];
        this.stream = json.stringify(this.objects, this.options);
    },
    getvalue: function() {
        return this.stream;
    }
});

//Deserialize a stream or string of JSON data.
function Deserializer(stream_or_string) {
    if (isinstance(stream_or_string, String))
        stream = String(stream_or_string);
    else
        stream = stream_or_string;
    for (var obj in JavaScriptDeserializer(json.parse(stream)))
        yield obj;
}

var Proxy = type('Proxy', [ object ], {
    __init__: function(rpc) {
        this.model = null;
        this.rpc = rpc;
    },

    contribute_to_class: function(model, name){
        this.model = model;
        var pd = new ProxyDescriptor(this);
        model.__defineGetter__(name, function(){ return pd.__get__(this, this.constructor); });
    },

    all: function() {
        var data = this.rpc.damedatos(string(this.model._meta), 'all');
        return json.parse(data);
    },

    count: function() {
        var data = this.rpc.damedatos(string(this.model._meta), 'count');
        return data;
    },

    dates: function() {

    },

    distinct: function() {

    },

    extra: function() {

    },

    get: function() {
        var arg = new Arguments(arguments);
        var data = this.rpc.damedatos(string(this.model._meta), 'filter', arg.kwargs);
        return json.parse(data);
    },

    get_or_create: function() {

    },

    create: function() {

    },

    filter: function() {
        var arg = new Arguments(arguments);
        var data = this.rpc.damedatos(string(this.model._meta), 'filter', arg.kwargs);
        return json.parse(data);
    },

    complex_filter: function() {
        
    },

    exclude: function() {
        
    },

    in_bulk: function() {
        
    },

    iterator: function() {
        
    },

    latest: function() {
        
    },

    order_by: function() {
        
    },

    select_related: function() {
        
    },

    update: function() {
        
    },

    reverse: function() {
        
    },

    _insert: function(values) {
        
    },

    _update: function(values) {
        
    }
});

var ProxyDescriptor = type('ProxyDescriptor', [ object ], {
    __init__: function(proxy){
        this.proxy = proxy;
    },
    
    __get__: function(instance, type) {
        if (!isinstance(instance, type))
            throw new AttributeError("Proxy isn't accessible via %s instances".subs(type.__name__));
        return this.proxy;
    }
});

publish({    
    Proxy: Proxy,
    ProxyDescriptor: ProxyDescriptor,
});