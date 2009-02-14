$L('doff.db.models');

var Tag = Class('Tag', models.Model, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    description: new models.TextField('Description', {'help_text':'Short summary of this tag'}),
});

var Post = Class('Post', models.Model, {
    slug: new models.SlugField('Slug', {'primary_key':true}),
    assoc_tags: new models.ManyToManyField(Tag),
    title: new models.CharField('Title', {'max_length':30}),
    date: new models.DateTimeField('Date'),
    //image: new model.ImageField('Attach Image', upload_to='postimgs', blank=True)
    body: new models.TextField('Body Text'),
    Meta: {
        ordering: ['-date']
    }
});

$P({    'Tag': Tag,
        'Post': Post    });