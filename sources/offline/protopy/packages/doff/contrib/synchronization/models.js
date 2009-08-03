var models = require('doff.db.models.base');

var SyncLog = type('SyncLog', models.Model, {
    SYNC_STATUS: [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512})
});

var SyncModel = type('SyncModel', models.Model, {
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false, "serialize": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false, "serialize": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c", "serialize": false}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false, "serialize": false}),
    Meta: {
        abstract: true
    }
});

publish({
    SyncLog: SyncLog,
    SyncModel: SyncModel
});