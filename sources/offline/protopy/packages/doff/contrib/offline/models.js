require('json');
require('event');
require('rpc', 'ServiceProxy');
require('doff.contrib.offline.serializers', 'RemoteSerializer');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.db.models.query', 'CollectedObjects');
var models = require('doff.db.models.base');
require('doff.core.project', 'get_project');

var serializer = new RemoteSerializer();

function mark_or_delete_objects(seen_objs) {
    try {
        var ordered_classes = seen_objs.keys();
    } catch (e if isinstance(e, CyclicDependency)) {
        ordered_classes = seen_objs.unordered_keys();
    }

    for each (var cls in ordered_classes) {
        var itms = items(seen_objs.get(cls));
        itms.sort();

        var instance_list = [instance for each ([pk, instance] in itms)];
        for each (var instance in instance_list) {
            if (!instance.active || instance.status == 'c') {
                // Si esta inactivo o se creo en el cliente y no se informo al servidor lo borro
                super(models.Model, instance).delete();
            } else {
                instance.status = 'd';
                instance.save();
            }
        }
    }
}

//Quitar los que no esten activos o estan marcados para borrar
var RemoteManager = type('RemoteManager', [ models.Manager ], {
    get_query_set: function() {
        return super(models.Manager, this).get_query_set().filter({ active: true }).exclude({ status: "d" });
    }
});

var RemoteStatusManager = type('RemoteStatusManager', [ models.Manager ], {
    __init__: function(status) {
        if (!status in SyncLog.SYNC_STATUS)
            throw new Exception("Status must be s,c,m,d");
        this.status = status;
        super(models.Manager, this).__init__();
    },

    get_query_set: function() {
        return super(models.Manager, this).get_query_set().filter({ status: this.status });
    }
});

var SyncLog = type('SyncLog', [ models.Model ], {
    SYNC_STATUS: { "s": "Synced",
                   "c": "Created",
                   "m": "Modified",
                   "d": "Deleted",
                   "b": "Bogus" }
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512}),

    Meta: {
        get_latest_by: 'synced_at'
    }
});

var RemoteModel = type('RemoteModel', [ models.Model ], {
    sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    active: new models.BooleanField( {"default": true, "editable": false, "serialize": false}),
    status: new models.CharField( {"max_length": 1, "choices": items(SyncLog.SYNC_STATUS), "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.CharField( {"max_length": 255, "unique": true, "null": true, "blank": true, "editable": false, "serialize": false}),

    all: new models.Manager(),
    objects: new RemoteManager(),
    created: new RemoteStatusManager("c"),
    modified: new RemoteStatusManager("m"),
    deleted: new RemoteStatusManager("d"),

    Meta: {
        abstract: true
    },

    save: function() {
        var pk_set = this._get_pk_val() != null;
        if (pk_set && this.status == 's' && this.status != 'd') {
            // Es un update de algo que esta en el server
            this.status = 'm';
        } else if (this.status != 'd') {
            this.status = 'c';
        }
        super(models.Model, this).save();
    },

    delete: function() {
        assert (this._get_pk_val(), "%s object can't be deleted because its %s attribute is set to None.".subs(this._meta.object_name, this._meta.pk.attname));

        // Find all the objects than need to be deleted.
        var seen_objs = new CollectedObjects();
        this._collect_sub_objects(seen_objs);

        // Actually delete the objects.
        mark_or_delete_objects(seen_objs);
    }
});

var RemoteReadOnlyModel = type('RemoteReadOnlyModel', [ RemoteModel ], {
    Meta: {
        abstract: true
    },

    save: function() {
        throw new Exception('Read only model');
    }
});

/* REMOTES AND MANAGERS */
var RemoteManagerDescriptor = type('RemoteManagerDescriptor', [ object ], {
    __init__: function(model) {
        this.model = model;
        var project = get_project();
        this.url_data = project.offline_support + '/data/' + string(this.model._meta).replace('.', '/') + '/';
        this.hgon = event.subscribe('go_online', getattr(this, 'go_online'));
        this.hgoff = event.subscribe('go_offline', getattr(this, 'go_offline')); 
    },

    __get__: function() {
        return this.proxy;
    },

    go_online: function() {
    	if (isundefined(this._proxy))
    		this._proxy = new ServiceProxy(this.url_data, {asynchronous: false});
    	this.proxy = this._proxy;
    },
    
    go_offline: function() {
    	this.proxy = null;
    }
});

// SI este archivo se cargo es porque esta incluido como app, porque del lado del server estan exportando modelos, hago los links para todo el despelote */

function ensure_default_remote_manager(cls) {
    if (!cls._meta['abstract'] && issubclass(cls, RemoteModel)) {
        try {
            var f = cls._meta.get_field('remotes');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if isinstance(e, FieldDoesNotExist)) {}
        var remote_descriptor = new RemoteManagerDescriptor(cls);
        cls.__defineGetter__('remotes', function() { return remote_descriptor.__get__(); });
    }
};

function ensure_data_first_synchronization(project) {
	require('doff.contrib.offline.handler', 'SyncHandler');
	var sync = new SyncHandler(project.settings);
	sync.update();
}

var hcp = event.subscribe('class_prepared', ensure_default_remote_manager);
var hpi = event.subscribe('post_install', ensure_data_first_synchronization);

publish({
    SyncLog: SyncLog,
    RemoteModel: RemoteModel,
    RemoteReadOnlyModel: RemoteReadOnlyModel
});