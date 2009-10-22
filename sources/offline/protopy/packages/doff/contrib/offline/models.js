var models = require('doff.db.models.base');
require('doff.contrib.offline.proxy');
require('json');

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

var RemoteReadOnlyModel = type('RemoteReadOnlyModel', [ models.Model ], {
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false, "serialize": false}),
    
    Meta: {
        abstract: true
    },

    save: function() {
        //Solo se pueden guardar aquellos que tengan _sync_log y server_pk osea que vengan del servidor
        if (this._sync_log == null || this.server_pk == null)
            throw new Exception('Read only model');
        super(models.Model, this).save();
    }
});

var RemoteModel = type('RemoteModel', [ models.Model ], {
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false, "serialize": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false, "serialize": false}),

    Meta: {
        abstract: true
    },

    remote_save: function() {
        this.remote_save_base(null);
    },

    remote_save_base: function(cls) {
        cls = cls || this.__class__;
        var meta = cls._meta;
        
        for each (var [parent, field] in meta.parents.items()) {
            if (!this[parent._meta.pk.attname] && this[field.attname])
                this[parent._meta.pk.attname] = this[field.attname];

            this.remote_save_base(parent);
            this[field.attname] = this._get_pk_val(parent._meta);
        }
        
        var non_pks = [f for each (f in meta.local_fields) if (!f.primary_key)];

        // First, try an UPDATE. If that doesn't update anything, do an INSERT.
        var pk_val = this._get_pk_val(meta);
        var pk_set = pk_val != null;
        var record_exists = true;
        var manager = cls.remotes;
        if (pk_set) {
            // Determine whether a record with the primary key already exists.
            if (bool(manager.filter({'pk':pk_val}).extra({'a': 1}).values('a').order_by())) {
                // It does already exist, so do an UPDATE.
                if (non_pks) {
                    var values = [[f, null, f.get_db_prep_save(this[f.attname] || f.pre_save(this, false))] for each (f in non_pks)];
                    var rows = manager.filter({'pk':pk_val})._update(values);
                    if (!rows)
                        throw new DatabaseError('Forced update did not affect any rows.');
                }
            } else { 
                record_exists = false; 
            }
        }
        if (!pk_set || !record_exists) {
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

publish({
    SyncLog: SyncLog,
    RemoteReadOnlyModel: RemoteReadOnlyModel,
    RemoteModel: RemoteModel
});