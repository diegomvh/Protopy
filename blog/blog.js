var tags = ['Administración', 'Argentina', 'Debian', 'Dinero Todopoderoso', 'El Lado Oscuro', 'Firefox', 'GNOME', 'GNU/GPL', 'Internet', 'Juegos', 'KDE', 'Kernel', 'Links', 'Linux', 'Mandrake', 'Microsoft', 'Noticias', 'Ouch!', 'Programación', 'Red Hat', 'Seguridad', 'Software', 'SuSE', 'Ubuntu', 'Windows'];
if (__name__ == '__main__') {
    $L('sys');
    sys.path['blog'] = '/blog/';
    settings = '/blog/settings.js';
    $L('blog.apps.post.views');
    views.syncdb();
    for each (var tag in tags)
        views.add_tag(tag, 'Un tag para ' + tag);

}