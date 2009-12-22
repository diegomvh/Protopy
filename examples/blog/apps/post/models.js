var models = require('doff.db.models.base');
require('doff.template.default_filters', 'slugify');

var get_abs_url = function () { return 'blog/' + string(this._meta).replace('.', '/'); }

var Tag = type('Tag', [ models.Model ], {
	slug: new models.SlugField({help_text: 'Automatically buit from the title', primary_key: true, editable: false}),
	title: new models.CharField('Title', {max_length: 30}),
	
	__str__: function() {
        return this.title;
    },

    save: function() {
        this.slug = slugify(this.title);
        super(models.Model, this).save();
    },

    get_absolute_url: get_abs_url
});

var Post = type('Post', [ models.Model ], {
	title: new models.CharField('Title', {max_length: 30}),
	tags: new models.ManyToManyField(Tag, {'blank': true}),
	date: new models.DateTimeField('Date', { auto_now: true }),
    body: new models.TextField('Body text'),
	
	__str__: function() {
        return this.title;
    },

    get_absolute_url: get_abs_url
});

publish({
    Post: Post, 
    Tag: Tag
});