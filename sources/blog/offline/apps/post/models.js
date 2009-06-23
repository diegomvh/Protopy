var models = require('doff.db.models.base');

var Tag = type('Tag', models.Model, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true, 'editable': false}),
    title: new models.CharField('Title', {'max_length':30})
});

var Post = type('Post', models.Model, {
    slug: new models.SlugField('Slug', {'primary_key':true, 'editable': false}),
    title: new models.CharField('Title', {'max_length':30}),
    tags: new models.ManyToManyField(Tag),
    date: new models.DateTimeField('Date', {'editable': false, 'auto_now': true}),
    body: new models.TextField('Body Text'),
    Meta: {
        ordering: ['-date']
    }
});

publish({
    Tag: Tag,
    Post: Post
});