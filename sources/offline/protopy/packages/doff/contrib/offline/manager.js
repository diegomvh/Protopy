/* "doff.contrib.sync.manager" */
require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');

//TODO: no me gusta mucho esto de tomar el rpc asi por la fuerza
var url_base = get_project().offline_support + '/rpc/data';

var RemoteManagerDescriptor = type('RemoteManagerDescriptor', [ object ], {
    __init__: function(model) {
        this.model = model;
    },

    __get__: function() {
        var url = url_base + '/' + string(this.model._meta).replace('.', '/') + '/';
        return new ServiceProxy(url, {asynchronous: false});
    }
});

publish({
    RemoteManagerDescriptor: RemoteManagerDescriptor,
});