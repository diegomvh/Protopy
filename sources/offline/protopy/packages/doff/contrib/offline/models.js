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

var SyncLog = type('SyncLog', [ models.Model ], {
    SYNC_STATUS: [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512}),

    Meta: {
        get_latest_by: 'synced_at'
    },
    __json__: function() {
        return json.stringify({ model: string(this._meta), synced_at: this.synced_at, sync_id: this.sync_id });
    }
});

var RemoteModel = type('RemoteModel', [ models.Model ], {
    sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    active: new models.BooleanField( {"default": true, "editable": false, "serialize": false}),
    status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.CharField( {"max_length": 255, "unique": true, "null": true, "blank": true, "editable": false, "serialize": false}),

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
        debugger;
        if (server_pk_set) {
            // Determine whether a record with the primary key already exists.
            var obj = remotes.filter({'pk': server_pk_val});
            if (bool(obj)) {
                // It does already exist, so do an UPDATE.
                values = serializer.serialize([ this ])[0];
                var rows = remotes.update(values);
                if (!rows)
                    throw new DatabaseError('Forced update did not affect any rows.');
            } else {
                record_exists = false;
            }
        }
        if (!server_pk_set || !record_exists) {
            if (!pk_set) {
                var values = [[f, f.get_db_prep_save(this[f.attname] || f.pre_save(this, true))] for each (f in meta.local_fields) if (!(f instanceof models.AutoField))];
            } else {
                var values = [[f, f.get_db_prep_save(this[f.attname] || f.pre_save(this, true))] for each (f in meta.local_fields)];
            }

            if (meta.order_with_respect_to) {
                var field = meta.order_with_respect_to;
                var key1 = field.name;
                values.concat([meta.get_field_by_name('_order')[0], manager.filter({key1: this[field.attname]}).count()]);
            }
            record_exists = false;

            var update_pk = bool(meta.has_auto_field && !pk_set);
            if (bool(values))
                // Create a new record.
                var result = manager._insert(values, {'return_id': update_pk});
            else
                // Create a new record with defaults for everything.
                var result = manager._insert([[meta.pk, connection.ops.pk_default_value()]], {'return_id':update_pk, 'raw_values':true});

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
        cls.__defineSetter__('remotes', function(value) { return remote_descriptor.__set__(value); });
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_remote_manager);

publish({
    SyncLog: SyncLog,
    RemoteReadOnlyModel: RemoteReadOnlyModel,
    RemoteModel: RemoteModel
});