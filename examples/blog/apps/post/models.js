var models = require('doff.db.models.base');

var Tag = type('Tag', [ models.Model ], {
	slug: new models.SlugField({help_text: 'Automatically buit from the title', primary_key: true}),
	title: new models.CharField('Title', {max_length: 30}),
	
	__str__: function() {
        return this.title;
    }
});

var Post = type('Post', [ models.Model ], {
	title: new models.CharField('Title', {max_length: 30}),
	tags: new models.ManyToManyField(Tag),
	date: new models.DateTimeField('Date', { auto_now: true }),
    body: new models.TextField('Body text'),
	
	__str__: function() {
        return this.title;
    }
});

publish({
    Post: Post,
    Tag: Tag
});