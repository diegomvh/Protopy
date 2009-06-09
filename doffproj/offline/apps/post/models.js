var models = require('doff.db.models.base');
require('doff.template.default_filters', 'slugify');

var Tag = type('Tag', models.Model, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true, 'editable': false}),
    title: new models.CharField('Title', {'max_length':30}),
    __str__: function(){
        return this.title;
    },
    save: function(){
        this.slug = slugify(this.title);
        super(models.Model, this).save();
    }
});

var Post = type('Post', models.Model, {
    slug: new models.SlugField('Slug', {'primary_key':true, 'editable': false}),
    title: new models.CharField('Title', {'max_length':30}),
    tags: new models.ManyToManyField(Tag),
    date: new models.DateTimeField('Date', {'editable': false, 'auto_now': true}),
    body: new models.TextField('Body Text'),
    Meta: {
        ordering: ['-date']
    },
    save: function(){
        this.slug = slugify(this.title);
        super(models.Model, this).save();
    }
});

publish({
    Tag: Tag,
    Post: Post
});