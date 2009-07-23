require('blog.post.mixin', 'Post', 'Tag');
require('doff.template.context', 'RequestContext');
require('doff.template.loader');
require('doff.core.http', 'HttpResponse', 'HttpResponseRedirect');

function index(request) {
    require('doff.db.base', 'connection');
    var response = new HttpResponse();
    if (!bool(connection.introspection.table_names())) {
        var t = loader.get_template('index.html');
	response.write(t.render(new RequestContext(request, {'sin_tablas': true})));
    } else {
        var t = loader.get_template('show_posts.html');
	response.write(t.render(new RequestContext(request, {'posts': Post.objects.all().order_by('-date'), 'tags': Tag.objects.all().order_by('title')})));
    }
    return response;
}

publish({ 
    index: index
});