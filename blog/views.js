$L('blog.apps.post.models', 'Post', 'Tag');
$L('doff.template.context', 'RequestContext');
$L('doff.template.loader');
$L('doff.core.http', 'HttpResponse', 'HttpResponseRedirect');

function index(request) {
    $L('doff.db', 'connection');
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

function syncdb(request) {
    var s = $L('doff.core.commands.syncdb');
    s.execute();
    return new HttpResponseRedirect('/');
}

function removedb(request) {
    var s = $L('doff.core.commands.removedb');
    s.execute();
    return new HttpResponseRedirect('/');
}

$P({ 
        'index': index,
        'syncdb': syncdb,
        'removedb': removedb
});