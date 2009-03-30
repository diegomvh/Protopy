var tags = ['Administración', 'Argentina', 'Debian', 'Dinero Todopoderoso', 'El Lado Oscuro', 'Firefox', 'GNOME', 'GNU/GPL', 'Gentoo', 'Geek', 'Internet', 'Juegos', 'KDE', 'Kernel', 'Links', 'Linux', 'Mandrake', 'Microsoft', 'Noticias', 'Ouch!', 'Programación', 'Red Hat', 'Seguridad', 'Software', 'SuSE', 'Ubuntu', 'Windows', 'Linus Torvalds'];
if (__name__ == '__main__') {
    $L('sys');
    sys.register_module_path('blog', '/blog');
    var settings = '/blog/settings.js';
    $L('blog.apps.post.views');
    views.syncdb();
    for each (var tag in tags)
        views.add_tag(tag, 'Un tag para ' + tag);
    var p1 = views.add_post('Lanzamientos de Ubuntu hasta el 2015', 'Desde la actual versión con soporte extendido Ubuntu 8.04 "LTS" hasta la lejana Ubuntu 11.04, este calendario de los ciclos de lanzamiento de esta distribución muestra qué podemos esparar de ella hasta el 2015. En el calendario se hace evidente también la diferencia fundamental entre una versión "LTS" y otra standard.');
    var p2 = views.add_post('Daniel Robbins contrataca con Funtoo', 'Funtoo es una variante de Gentoo Linux creada por el mismo Daniel Robbins, el fundador original de esa distribución que renunció a ella y luego fue contratado por Microsoft para después abandonarla y que más recientemente propuso, sin éxito, salvar a la Fundación Gentoo de sus problemas. \nFuntoo presenta algunas novedades muy originales con respecto a Gentoo, como por ejemplo un repositorio de Portage basado en Git y hospedado en el ascendente GitHub, y también Metro, la herramienta para construir versiones de Funtoo y templates para OpenVZ.\nY afortundamente para los más interesados, hace sólo un par de días se publicó la Guía de Instalación Rápida de Funtoo en nuestro propio idioma.');
    var p3 = views.add_post('CodePlex crece más del 100% en el 2008', 'En el 2006 Microsoft presentó CodePlex, su propio sitio para alojar proyectos Open Source, o como lo llamamos en aquel momento, "el SourceForge de Microsoft". Recientemente CodePlex publicó su resumen para el 2008 comparando algunos números de su comunidad con los del año anterior, de donde se desprenden datos muy alentadores:<ol><li>Visitas: 119% de incremento.</li><li>Nuevos proyectos: 113% de incremento.</li><li>Nuevos usuarios registrados: 72% de incremento.</li></ol>\nTodas las estadísticas son positivas, demostrando que muchos desarrolladores no están evitando los servicios gratuitos de CodePlex sólo porque son de Microsoft.');
    var p4 = views.add_post('Grupo KDE Argentina', '<p>El 22 de Noviembre de 2008 pasado se inauguró oficialmente <a href="http://www.kde.org.ar/">KDE-AR</a>, un grupo de usuarios y desarrolladores de KDE en Argentina. Los objetivos formales están <a href="http://kde.org.ar/node/1">especificados aquí</a>, pero concretamente las ideas que surgieron en sus reuniones son:</p><ul><li><strong>Traducción de la web oficial de KDE.</strong><br />\
                        La web oficial de KDE es una de las principales fuentes de documentación de KDE. Una de las ideas del grupo es traducirla y/o actualizarla a través de la web oficial de KDE (la que está en el wiki) y además subirla a la web del grupo. En referencia a esto, se creó la <a href="http://kde.org.ar/node/10">página traducciones</a>.</li>\
                        <li><strong>Portar aplicaciones abandonadas de KDE3 a KDE4.</strong><br />\
                        El primer paso es traducir <a href="http://techbase.kde.org/Development/Tutorials/KDE4_Porting_Guide">este documento</a>.<br />\
                        Las primeras aplicaciones que pensamos portar son <a href="http://ktranslator.sourceforge.net/">KTranslator</a> y <a href="http://www.kde-apps.org/content/show.php?content=10019">Atlantik</a>.</li>\
                        <li><strong>Desarrollo de software propio.</strong><br />\
                        Por ahora tenemos unos <em>scripts</em> para descargar de RapidShare que se van a integrar con KGet, y un proyecto para portar <a href="http://aa.vslib.cz/silk/projekty/pinger/">Pinger</a> a Qt.</li>\
                        <li><strong><a href="http://dot.kde.org/1094109399/">Junior jobs</a>.</strong><br />\
                        Esto se hace para que las personas que quieran colaborar pero no estén familiarizados con la programación de KDE puedan aprender con tareas simples. Cuando se llegue a una solución, se la publicará en la web del grupo, junto con un tutorial sobre la resolución.</li>\
                        <li><strong>Participar en los <a href="http://techbase.kde.org/Contribute/Bugsquad/BugDays">Bug Triage &amp; Krush Days</a>.</strong><br />\
                        Estos son días en los que se junta gente por IRC a buscar bugs de alguna aplicación, buscar bugs duplicados y/o completar los informes de errores.</li>\
                        <li><strong>Desarrollar la documentación en español.</strong><br />\
                        La documentación oficial de aplicaciones está a cargo del grupo de traducción de KDE al Español, la idea no es solaparse con ellos, sino generar tutoriales (o juntar los que ya están).</li>\
                        <li><strong>Participar en los distintos eventos de Software Libre.</strong><br />\
                        Se puede armar un <em>stand</em>, mostrando los avances de KDE, repartir CDs, etc. Y participar en los Festivales de Instalación para que se instale KDE. También surgió la idea de hacer Festivales de Instalación de KDE.</li>\
                        <li><strong>Merchandising de KDE.</strong><br />\
                        Sí, ¡queremos remeras, tazas y stickers de KDE! Se pueden importar o mandar a hacerlas en Argentina.</li>\
                        <li><strong>Sitio web.</strong><br />\
                        Se necesita gente que esté interesada en colaborar con la migración de algunos módulos, así como también del tema Oxygen, de Drupal 5 a Drupal 6. Esta tarea se llevará a cabo en conjunto con <a href="http://www.kdehispano.org/">KDE Hispano</a>.</li></ul>');
    var p5 = views.add_post('Desarrollador de KDE le responde a Linus Torvalds', '<p><strong>Aaron Seigo</strong>, un desarrollador de KDE, respondió a la polémica desatada por las opiniones de <a href="/eventos/linus-torvalds-cambia-kde-por-gnome">Linus Torvalds sobre KDE4</a>, <a href="http://aseigo.blogspot.com/2009/01/choices-and-punishment.html">aclarando algunos motivos</a> de ese proyecto que podrían haber sido pasados por alto por el lector ocasional:</p>\
                        <blockquote>  <p>“Las decisiones que se tomaron en KDE 4.0 fueron para el futuro. Un futuro en el que vamos a vivir con el lanzamiento de la v4.2. <strong>KDE 4.2</strong> es un lanzamiento fenomenal y, al contrario que <strong>KDE 3.5</strong>, que también fue un lanzamiento fenomenal, esta nueva versión es una plataforma sobre la que podemos construir y competir en el mercado para la próxima década. Es multiplataforma, las librerías son mucho más claras y la tecnología disponible para el usuario en KDE4 es apropiada para su uso en computadoras modernas&amp;rdquo.</p>\
                        <p>“A pesar de que la v4.0 fue una decisión brutal y una que me costó (y creo que a otros también) noches sin dormir, fue lo que necesitábamos para asegurar que no termináramos empantanándonos en la irrelevancia”.</p></blockquote>\
                        <p>La advertencia más importante de Seigo es sin duda una lección que todos deberíamos tener en cuenta:</p>\
                        <blockquote><p>“Aquí el daño colateral será el miedo a la innovación. "No hagan nada demasiado grande, porque les costará y les costará..." es la lección que algunos están sacando de todo esto. El miedo es un asesino. Es algo que predispone a no tomar riesgos irrazonables, pero que también puede prevenir tomar riesgos saludables&rdquo;.</p></blockquote>');
    views.set_tags_by_title(p1, ['Linux', 'Ubuntu', 'Debian']);
    views.set_tags_by_title(p2, ['Gentoo', 'Geek']);
    views.set_tags_by_title(p3, ['Microsoft', 'El Lado Oscuro', 'Dinero Todopoderoso', 'Windows']);
    views.set_tags_by_title(p4, ['KDE']);
    views.set_tags_by_title(p5, ['KDE', 'Linus Torvalds']);
    views.show_posts();
}