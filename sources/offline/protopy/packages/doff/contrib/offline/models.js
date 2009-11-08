require('doff.contrib.offline.serializers', 'RemoteSerializer');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.db.models.query', 'CollectedObjects');
var models = require('doff.db.models.base');
require('json');

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

var RemoteStatusManager = type('RemoteNewsManager', [ models.Manager ], {
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
    },

    push: function() {

        // First, try an UPDATE. If that doesn't update anything, do an INSERT.
        var server_pk_val = this.server_pk;
        var server_pk_set = server_pk_val != null;
        var record_exists = true;
        var remotes = this.__class__.remotes;
        var meta = this._meta;
        if (server_pk_set) {
            // Determine whether a record with the primary key already exists.
            var obj = remotes.filter({'pk': server_pk_val});
            if (bool(obj)) {
                // It does already exist, so do an UPDATE.
                var values = serializer.serialize(this);
                remotes.update(values);
            } else {
                record_exists = false;
            }
        }
        if (!server_pk_set || !record_exists) {
            var values = serializer.serialize(this);

            var update_pk = bool(meta.has_auto_field && !server_pk_set);
            // Create a new record.
            var result = remotes.insert(values);

            if (update_pk) {
                this[meta.pk.attname] = result;
            }
        }
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

function ensure_default_remote_manager(cls) {
    if (!cls._meta['abstract'] && issubclass(cls, RemoteModel)) {
        require('doff.contrib.offline.manager', 'RemoteManagerDescriptor');
        try {
            var f = cls._meta.get_field('remotes');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if isinstance(e, FieldDoesNotExist)) {}
        var remote_descriptor = new RemoteManagerDescriptor(cls);
        cls.__defineGetter__('remotes', function() { return remote_descriptor.__get__(); });
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_remote_manager);

publish({
    SyncLog: SyncLog,
    RemoteModel: RemoteModel,
    RemoteReadOnlyModel: RemoteReadOnlyModel
});