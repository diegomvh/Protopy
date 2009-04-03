$L('blog.apps.post.models', 'Post', 'Tag');
$L('doff.template.context', 'RequestContext');
$L('doff.template.loader');

function index(request) {
    var t = loader.get_template('show_posts.html');
    $Q('#content')[0].innerHTML = t.render(new RequestContext(request, {'posts': Post.objects.all().order_by('-date'), 'tags': Tag.objects.all().order_by('title')}));
}

function syncdb(request) {
    var s = $L('doff.core.commands.syncdb');
    s.execute();
}

function removedb(request) {
    //TODO: Borrar base de datos
}

$P({ 
        'index': index,
        'syncdb': syncdb
});