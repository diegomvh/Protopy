/* "doff.contrib.synchronization.proxy" */
require('event');
require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.serializers', 'Deserializer');
require('doff.contrib.offline.models', 'SyncLog');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var url_base = get_project().offline_support + '/rpc/data';

var RemoteManager = type('RemoteManager', [ ServiceProxy ], {

    __init__: function(model) {
        this.model = model;
        super(ServiceProxy, this).__init__(url_base + '/' + string(this.model._meta).replace('.', '/') + '/', {asynchronous: false});
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
    __init__: function(model) {
        this.model = model;
        this.sync_log = null;
    },

    __get__: function(instance, type) {
        if (this.sync_log != null)
            print('retorno un manager copado');
        else
            print('retorno un manager no tan copado');
        return new ServiceProxy(url_base + '/' + string(this.model._meta).replace('.', '/') + '/', {asynchronous: false});;
    },

    __set__: function(value, instance, type) {
        if (value != null && !isinstance(value, SyncLog))
            throw new AttributeError("SyncLog is needed");
        this.sync_log = value;
        return this.manager;
    }
});

publish({
    RemoteManager: RemoteManager,
    RemoteManagerDescriptor: RemoteManagerDescriptor,
});