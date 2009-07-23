require('blog.post.models', '*');

extend(Post.prototype, {
    __str__: function() {
    	return this.title;
	}
});

extend(Tag.prototype, {
	__str__: function() {
		return this.title;
	}
});

publish({
	Post: Post,
	Tag: Tag
});