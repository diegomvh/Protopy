$L('blog.apps.post.models', 'Post', 'Tag');
$L('doff.template.context', 'RequestContext');
$L('doff.template.loader');

function index(request) {
    $L('doff.db', 'connection');
    if (!bool(connection.introspection.table_names())) {
        var t = loader.get_template('index.html');
        $Q('#content')[0].innerHTML = t.render(new RequestContext(request, {'sin_tablas': true}));
    } else {
        var t = loader.get_template('show_posts.html');
        $Q('#content')[0].innerHTML = t.render(new RequestContext(request, {'posts': Post.objects.all().order_by('-date'), 'tags': Tag.objects.all().order_by('title')}));
    }
}

function syncdb(request) {
    var s = $L('doff.core.commands.syncdb');
    s.execute();
    //TODO: implementar un redirect y algo como el response please :)
    blog.handler.handle('/');
}

function removedb(request) {
    var s = $L('doff.core.commands.removedb');
    s.execute();
    blog.handler.handle('/');
}

$P({ 
        'index': index,
        'syncdb': syncdb,
        'removedb': removedb
});