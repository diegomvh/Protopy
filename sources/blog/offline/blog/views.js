require('blog.post.models', 'Post', 'Tag');
require('doff.utils.shortcuts', 'render_to_response');
require('doff.template.context', 'RequestContext');

function index(request) {
    require('doff.db.base', 'connection');
    if (!bool(connection.introspection.table_names()))
        var response = render_to_response('base.html', {'sin_tablas': true}, new RequestContext(request));
    else
        var response = render_to_response('show_posts.html', {  'posts': Post.objects.all().order_by('-date'), 
                                                                'tags': Tag.objects.all().order_by('title')
                                                             }, new RequestContext(request));
    return response;
}

publish({ 
    index: index
});