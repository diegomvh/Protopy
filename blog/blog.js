var tags = ['Administración', 'Argentina', 'Debian', 'Dinero Todopoderoso', 'El Lado Oscuro', 'Firefox', 'GNOME', 'GNU/GPL', 'Gentoo', 'Geek', 'Internet', 'Juegos', 'KDE', 'Kernel', 'Links', 'Linux', 'Mandrake', 'Microsoft', 'Noticias', 'Ouch!', 'Programación', 'Red Hat', 'Seguridad', 'Software', 'SuSE', 'Ubuntu', 'Windows'];
if (__name__ == '__main__') {
    $L('sys');
    sys.path['blog'] = '/blog/';
    settings = '/blog/settings.js';
    $L('blog.apps.post.views');
    /*views.syncdb();
    for each (var tag in tags)
        views.add_tag(tag, 'Un tag para ' + tag);
    var p1 = views.add_post('Lanzamientos de Ubuntu hasta el 2015', 'Desde la actual versión con soporte extendido Ubuntu 8.04 "LTS" hasta la lejana Ubuntu 11.04, este calendario de los ciclos de lanzamiento de esta distribución muestra qué podemos esparar de ella hasta el 2015. En el calendario se hace evidente también la diferencia fundamental entre una versión "LTS" y otra standard.');
    var p2 = views.add_post('Daniel Robbins contrataca con Funtoo', 'Funtoo es una variante de Gentoo Linux creada por el mismo Daniel Robbins, el fundador original de esa distribución que renunció a ella y luego fue contratado por Microsoft para después abandonarla y que más recientemente propuso, sin éxito, salvar a la Fundación Gentoo de sus problemas. \nFuntoo presenta algunas novedades muy originales con respecto a Gentoo, como por ejemplo un repositorio de Portage basado en Git y hospedado en el ascendente GitHub, y también Metro, la herramienta para construir versiones de Funtoo y templates para OpenVZ.\nY afortundamente para los más interesados, hace sólo un par de días se publicó la Guía de Instalación Rápida de Funtoo en nuestro propio idioma.');
    var p3 = views.add_post('CodePlex crece más del 100% en el 2008', 'En el 2006 Microsoft presentó CodePlex, su propio sitio para alojar proyectos Open Source, o como lo llamamos en aquel momento, "el SourceForge de Microsoft". Recientemente CodePlex publicó su resumen para el 2008 comparando algunos números de su comunidad con los del año anterior, de donde se desprenden datos muy alentadores:<ol><li>Visitas: 119% de incremento.</li><li>Nuevos proyectos: 113% de incremento.</li><li>Nuevos usuarios registrados: 72% de incremento.</li></ol>\nTodas las estadísticas son positivas, demostrando que muchos desarrolladores no están evitando los servicios gratuitos de CodePlex sólo porque son de Microsoft.');
    views.set_tags_by_title(p1, ['Linux', 'Ubuntu', 'Debian']);
    views.set_tags_by_title(p2, ['Gentoo', 'Geek']);
    views.set_tags_by_title(p3, ['Microsoft', 'El Lado Oscuro', 'Dinero Todopoderoso', 'Windows']);*/
    views.show_posts();
}