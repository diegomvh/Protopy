/* "doff.contrib.synchronization.proxy" */
require('event');
require('rpc');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.core.project', 'get_project');
require('doff.core.serializers.javascript', 'Deserializer');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var url_base = get_project().offline_support + '/rpc/data';

function ensure_default_proxy(cls) {
    require('doff.contrib.offline.models', 'RemoteModel', 'RemoteReadOnlyModel');
    if (!cls._meta['abstract'] && issubclass(cls, [ RemoteModel, RemoteReadOnlyModel ])) {
        try {
            var f = cls._meta.get_field('remotes');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if isinstance(e, FieldDoesNotExist)) {}
        var rm = new RemoteManager(cls);
        cls.add_to_class('remotes', rm);
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_proxy);

var RemoteManager = type('RemoteManager', [ rpc.ServiceProxy ], {

    __init__: function(model) {
        this.model = model;
        super(rpc.ServiceProxy, this).__init__(url_base + '/' + string(this.model._meta).replace('.', '/') + '/', {asynchronous: false});
        this.sync_log = null;
    },

    contribute_to_class: function(model, name) {
        var pd = new RemoteManagerDescriptor(this);
        model.__defineGetter__(name, function() { return pd.__get__(this, this.constructor); });
    },

    __callMethod: function(methodName, params, successHandler, exceptionHandler, completeHandler) {
        if (this.in_sync)
            params.push(this.sync_log);
        var ret = super(rpc.ServiceProxy, this).__callMethod(methodName, params, successHandler, exceptionHandler, completeHandler);
        
        if (this.in_sync && isinstance(ret, Array) && bool(ret) && !isundefined(ret[0]['model']) && ret[0]['model'] === string(this.model._meta)) {
            var new_ret = [];
            for each (var obj in Deserializer(ret, this.sync_log)) {
                new_ret.push(obj);
            }
            ret = new_ret;
        }
        return ret;
    },
    
    get in_sync() {
        return this.sync_log != null;
    }
});

var RemoteManagerDescriptor = type('RemoteManagerDescriptor', [ object ], {
    __init__: function(proxy) {
        this.proxy = proxy;
    },

    __get__: function(instance, type) {
        if (!isinstance(instance, type))
            throw new AttributeError("Proxy isn't accessible via %s instances".subs(type.__name__));
        return this.proxy;
    }
});

publish({
    RemoteManager: RemoteManager,
    RemoteManagerDescriptor: RemoteManagerDescriptor,
});