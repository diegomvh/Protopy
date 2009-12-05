require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');
require('doff.contrib.offline.handler');
require('doff.contrib.offline.models', 'SyncLog');

var Sync = type('Sync', Panel, {
    __init__: function() {
        super(Panel, this).__init__('sync', 'Sync Tool', 'Sincronizacion de datos');
        this.icon = sys.module_url('doff.contrib.offline', 'resources/icons/sync.png');
        this.handler = new handler.SyncHandler();
        this.handler._sync_middleware = this;
        try {
	    	this.last_sync_log = SyncLog.objects.latest('pk');
	    } catch (e) {
	    	this.last_sync_log = null;
	    }
    },

    get_template: function() {
        var file = sys.module_url('doff.contrib.offline', 'resources/sync.html');
        var template = '';
        new ajax.Request(file, {
            method: 'GET',
            asynchronous : false,
            onSuccess: function(transport) {
            template = transport.responseText;
            },
            onException: function(obj, exception) {
            throw exception;
            },
            onFailure: function(transport) {
            throw new Exception("No template for sync");
            }
        });
        return template;
    },

    _display: function() {
        super(Panel, this)._display();
        var self = this;
        
        this.output = $('sync-output');
        
        this.bt_update = $('sync-update');
        event.connect(this.bt_update, 'click', function(event) {
        	self.handler.update();
        });
        
        this.bt_pull = $('sync-pull');
        event.connect(this.bt_pull, 'click', function(event) {
        	self.handler.pull();
        });
        
        this.bt_push = $('sync-push');
        event.connect(this.bt_push, 'click', function(event) {
        	self.handler.push();
        });
        
        this.bt_purge = $('sync-purge');
        event.connect(this.bt_purge, 'click', function(event) {
        	self.handler.purge();
        });
    },
    
    // Posiblemente tomar el pk del server y ponerlo en la local
    resolve_unique: function(local_object, remote_object) {
        debugger;
        return local_object;
    },

    // Posiblemente tomar la local y ponerla como sync
    reoslve_LocalDeletedRemoteModified: function(local_object, remote_object) {
    	debugger;
    	return local_object;
    },

    // Selecciona una de las dos
    resolve_LocalModifiedRemoteModified: function(local_object, remote_object) {
    	debugger;
    	return local_object;
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, remote_object) {
    	debugger;
    	return local_object;
    },

    before_push: function(chunked, data) {
    	this.output.insert('<p>Push data to server...</p>');
    	this.output.insert('<p>---> Objects { deleted: ' + len(data['deleted']['objects']) + ', modified: ' + len(data['modified']['objects']) + ', created: ' + len(data['created']['objects']) + '}</p>');
    },

    after_push: function(data) {
        return data;
    },

    before_pull: function(data) {
    	this.output.insert('<p>Pulling data from server...</p>');
    	this.output.insert('<p>---> SyncLog { date: ' + data['fields']['synced_at'].__json__() + ', id: "' + data['fields']['sync_id'] + '"}</p>');
    },

    after_pull: function(data) {
    	this.output.insert('<p>' + len(data['objects']) + ' objects pulled</p>');
    	this.output.insert('<p><--- SyncLog { date: "' + data['sync_log']['synced_at'] + '", id: "' + data['sync_log']['sync_id'] + '"}</p>');
    },

    after_merge: function (auto, local_object, remote_object) {

    }
    
});

publish({
    Sync: Sync
});