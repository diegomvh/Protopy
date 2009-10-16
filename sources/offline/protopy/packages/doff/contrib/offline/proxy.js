/* "doff.contrib.synchronization.proxy" */
require('event');
require('rpc');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.core.project', 'get_project');
var JavaScriptDeserializer = require('doff.core.serializers.javascript', 'Deserializer');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var url_base = get_project().offline_support + '/data';

function ensure_default_proxy(cls) {
    require('doff.contrib.offline.models', 'SyncModel');
    if (!cls._meta['abstract'] && issubclass(cls, SyncModel)) {
        try {
            var f = cls._meta.get_field('remotes');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if isinstance(e, FieldDoesNotExist)) {}
        var jsonrpc = new DataProxy(url_base + '/' + string(cls._meta).replace('.', '/') + '/', {asynchronous: false});
        cls.add_to_class('remotes', jsonrpc);
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_proxy);

var DataProxy = type('DataProxy', [ rpc.ServiceProxy ], {

    contribute_to_class: function(model, name) {
        this.model = model;
        var pd = new ProxyDescriptor(this);
        model.__defineGetter__(name, function(){ return pd.__get__(this, this.constructor); });
    },

    __callMethod: function(methodName, params, successHandler, exceptionHandler, completeHandler) {
        var ret = super(rpc.ServiceProxy, this).__callMethod(methodName, params, successHandler, exceptionHandler, completeHandler);
        if (isinstance(ret, Array) && !isundefined(ret[0]['model'])) {
            var new_ret = [];
            for each (var obj in JavaScriptDeserializer(ret))
                new_ret.push(obj);
            ret = new_ret;
        }
        return ret;
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
    DataProxy: DataProxy,
    ProxyDescriptor: ProxyDescriptor,
});