var models = require('doff.db.models.base');
require('doff.contrib.offline.proxy');

var SyncLog = type('SyncLog', [ models.Model ], {
    SYNC_STATUS: [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512})
});

var SyncModel = type('SyncModel', [ models.Model ], {
    __new__: function(name, bases, attrs) {
        if (name == 'SyncModel')
            return super(SyncModel, this).__new__(name, bases, attrs);
        
        var options = {};
        options['remote_app_label'] = attrs.Meta['remote_app_label'];
        var sync_model = super(SyncModel, this).__new__(name, bases, attrs);
        extend(sync_model._meta, options);
        return sync_model;
    }
}, {
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false, "serialize": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false, "serialize": false}),

    Meta: {
        abstract: true
    }

});


var ReadOnlyModel = type('ReadOnlyModel', [ models.Model ],
    /**
        * Modelo read only, cuando se le registra un modelo a un remote site sin sus
        * haber registrado los modelos a los cuales hace referencia, se crea una 
        * instancia de ReadOnlyModel en el clinete, que solo permite hacer referencia
        * pero no crear, modificar o borrar. 
        */
    {
        pk: new models.CharField({'max_length': 255 }),
        value: new models.CharField({'max_legth': 255}),
        __str__: function () {
            /**
                * Por defecto se devuelve el __str__ del server
                */
            return this.value;
        }
    }
);

publish({
    SyncLog: SyncLog,
    SyncModel: SyncModel
});