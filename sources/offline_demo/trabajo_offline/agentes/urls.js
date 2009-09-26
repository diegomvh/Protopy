// Top level offline url-to-view mapping.

require('doff.conf.urls', '*');
require('agentes.views', '*');

var urlpatterns = patterns('',
    ['^$', index]
//    ['^ventas/', include('agentes.ventas.urls') ]
)


// Don't touch this line
publish({ 
    urlpatterns: urlpatterns 
});
