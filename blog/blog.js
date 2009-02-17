if (__name__ == '__main__') {
    $L('sys');
    sys.path['blog'] = '/blog/';
    settings = '/blog/settings.js';
    //Por las dudas no estan creo las tablas
    $L('doff.core.commands.syncdb').execute();
    
    $L('blog.apps.post.models');
    var t = new models.Tag({title:'Linux', slug:'Linux', description:'Un tag para cosas linux'});
    t.save();
    t = new models.Tag({title:'Geek', slug:'Geek', description:'Un tag para cosas geek'});
    t.save();
    
    var p = new models.Post({title:'Fedora 10 Re-Spin', slug:'fedora-10-respin', body:'Desde el Proyecto Fedora Brasil se anuncia la disponibilidad del primer Re-Spin del actual Fedora 10, incluyendo todas las actualizaciones de esa distribución hasta este último 10 de Febrero. Este Fedora 10 Re-Spin está disponible en formato DVD (3.6 Gb) con soporte de múltiples idiomas y también en formato LiveCD con el escritorio KDE4, ambas sólo para la arquitectura x86.', date: new Date()});
    p.tags.add(models.Tag.objects.get({slug:'Linux'}));
    p.save();
    
    p = new models.Post({title:'Compiz, una historia interesante', slug:'compiz-una-historia-interesante', body:'SmSpillaz publicó en su blog un post titulado Compiz, an interesting history, con una imagen que describe las bifurcaciones y variantes que ha habido en el proyecto Compiz desde que fue iniciado. No es habitual que un proyecto con tan poco tiempo de vida haya tenido tantas divisiones internas en el equipo de desarrollo, pero los deseos de todos los usuarios son claros: que se llame como sea pero que se aúnen los esfuerzos y se continúe progresando con el mismo ritmo que hasta hace poco.', date: new Date()});
    p.tags.add(models.Tag.objects.get({slug:'Linux'}));
    p.tags.add(models.Tag.objects.get({slug:'Geek'}));
    p.save();
    
    $L('doff.template.loader');
    var t = loader.get_template('post.html');
    $L('doff.template.context', 'Context');
    document.write(t.render(new Context({posts:models.Post.objects.all()})));
    document.close();
}