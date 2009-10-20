var models = require('doff.db.models.base');
require('doff.contrib.offline.proxy');

var SyncLog = type('SyncLog', [ models.Model ], {
    SYNC_STATUS: [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512})
});

var SyncModel = type('SyncModel', [ models.Model ], {
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false, "serialize": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false, "serialize": false}),

    Meta: {
        abstract: true
    }

});

var ReadOnlyModel = type('ReadOnlyModel', [ models.Model ], {
    /**
        * Modelo read only, cuando se le registra un modelo a un remote site sin sus
        * haber registrado los modelos a los cuales hace referencia, se crea una 
        * instancia de ReadOnlyModel en el clinete, que solo permite hacer referencia
        * pero no crear, modificar o borrar. 
        */
    id: new models.CharField({'max_length': 255, primary_key: true }),
    value: new models.CharField({'max_length': 255}),
    __str__: function () {
        /**
         * Por defecto se devuelve el __str__ del server
         */
        return this.value;
    }
});

publish({
    SyncLog: SyncLog,
    SyncModel: SyncModel
});