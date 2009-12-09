require('doff.template.base', 'Library');
require('blog.apps.post.models', 'Post', 'Tag');

var register = new Library();
function tags() {
    var tags = Tag.objects.all();
    return { "tags": tags };
}
register.inclusion_tag("tags.html")(tags);

function entries(context) {
	var posts = Post.objects.order_by('-pk').slice(1, 6);
    return { "posts": posts, 'MEDIA_URL': context.get('MEDIA_URL') };
}
register.inclusion_tag("entries.html", { takes_context: true })(entries);

publish({
	register: register
});