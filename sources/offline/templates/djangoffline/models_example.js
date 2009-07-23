var models = require('doff.db.models.base');

var SyncLog = type('SyncLog', models.Model, {
    SYNC_STATUS: [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
},{
    synced_at: new models.DateTimeField('Date', {'editable': false}),
    sync_id: new models.CharField({'max_length': 512})
});

var Tag = type('Tag', models.Model, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    
    /* Sync */
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c"}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false})
});


var Post = type('Post', models.Model, {
    slug: new models.SlugField('Slug', {'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    tags: new models.ManyToManyField(Tag),
    date: new models.DateTimeField('Date', {'editable': false, 'auto_now': true}),
    body: new models.TextField('Body Text'),
    
    /* Sync */
    _sync_log: new models.ForeignKey(SyncLog, {"db_index": true, "null": true, "blank": true, "editable": false}),
    _active: new models.BooleanField( {"default": true, "blank": true, "editable": false}),
    _status: new models.CharField( {"max_length": 1, "choices": SyncLog.SYNC_STATUS, "editable": false, "default": "c"}),
    server_pk: new models.PositiveIntegerField( {"null": true, "blank": true, "editable": false}),
    Meta: {
        ordering: ['-date']
    }
});

publish({
    Tag: Tag,
    Post: Post
});