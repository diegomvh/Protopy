$L('doff.db.models');

var Usuario = type('Usuario', models.Model, {
    name: new models.CharField('Name', {'max_length':20})
});

var Tag = type('Tag', models.Model, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    '__str__': function __str__(){
        return this.title;
    }
});

var Post = type('Post', models.Model, {
    slug: new models.SlugField('Slug', {'primary_key':true}),
    tags: new models.ManyToManyField(Tag),
    title: new models.CharField('Title', {'max_length':30}),
    date: new models.DateTimeField('Date'),
    //image: new model.ImageField('Attach Image', upload_to='postimgs', blank=True)
    body: new models.TextField('Body Text'),
    usuario: new models.ForeignKey(Usuario, {'null':true}),
    Meta: {
        ordering: ['-date']
    }
});

$P({    'Tag': Tag,
        'Post': Post,
        'Usuario': Usuario    });