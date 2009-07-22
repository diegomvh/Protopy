require('doffline.export.post.models', '*');
require('doff.db.models.base', 'Model');
require('doff.template.default_filters', 'slugify');

extend(Post.prototype, {
	save: function(){
    	this.slug = slugify(this.title);
    	super(Model, this).save();
	}
});

extend(Tag.prototype, {
    save: function(){
    	this.slug = slugify(this.title);
    	super(Model, this).save();
	}
});

publish({
	Post: Post,
	Tag: Tag
});