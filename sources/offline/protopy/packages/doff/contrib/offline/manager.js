/* "doff.contrib.synchronization.proxy" */
require('event');
require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.serializers', 'RemoteDeserializer');
require('doff.contrib.offline.models', 'SyncLog');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var url_base = get_project().offline_support + '/rpc/data';

var RemoteManager = type('RemoteManager', [ ServiceProxy ], {

    __init__: function(url, sync_log) {
        this.url = url;
        this.sync_log = sync_log;
        super(ServiceProxy, this).__init__(url, {asynchronous: false});
    },

    __callMethod: function(methodName, params, successHandler, exceptionHandler, completeHandler) {
        //Meto el sync_log en la consulta
        if (!methodName.startswith('system.'))
            params.push(this.sync_log);
        
        var ret = super(ServiceProxy, this).__callMethod(methodName, params, successHandler, exceptionHandler, completeHandler);
        
        if (!methodName.startswith('system.')) {
            if (isinstance(ret, Array) && bool(ret)) {
                var new_ret = [];
                for each (var obj in RemoteDeserializer(ret, this.sync_log)) {
                    new_ret.push(obj);
                }
                ret = new_ret;
            }
        }
        return ret;
    }
});

var RemoteManagerDescriptor = type('RemoteManagerDescriptor', [ object ], {
    __init__: function(model) {
        this.model = model;
        this.sync_log = null;
    },

    __get__: function() {
        var url = url_base + '/' + string(this.model._meta).replace('.', '/') + '/';
        if (this.sync_log != null) {
            //Si tengo sync_log retorno un objeto RemoteManager
            return new RemoteManager(url, this.sync_log);
        } else {
            //Si no tengo sync_log es simplemente un ServiceProxy
            return new ServiceProxy(url, {asynchronous: false});
        }
    },

    __set__: function(value) {
        if (value != null && !isinstance(value, SyncLog))
            throw new AttributeError("SyncLog is needed");
        this.sync_log = value;
    }
});

publish({
    RemoteManager: RemoteManager,
    RemoteManagerDescriptor: RemoteManagerDescriptor,
});