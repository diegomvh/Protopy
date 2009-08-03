require('blog.post.mixin');
var models = require('doff.db.models.base');
require('doff.contrib.synchronization.models', 'SyncModel');

var Tag = type('Tag', SyncModel, extend(mixin.Tag, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
}));


var Post = type('Post', SyncModel, extend(mixin.Post, {
    slug: new models.SlugField('Slug', {'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    tags: new models.ManyToManyField(Tag),
    date: new models.DateTimeField('Date', {'editable': false, 'auto_now': true}),
    body: new models.TextField('Body Text'),

    Meta: {
        ordering: ['-date']
    }
}));

publish({
    Tag: Tag,
    Post: Post
});