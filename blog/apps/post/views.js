$L('blog.apps.post.models', 'Tag', 'Post');

var build_tables = function(){
    print('Creando las tablas');
    var s = $L('doff.core.management.commands.syncdb');
    s.execute();
}

$P({ 'build_tables': build_tables });