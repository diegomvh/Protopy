// Top level offline url-to-view mapping.

require('doff.conf.urls', '*');
require('agentes.views', '*');
require('agentes.core.models', 'Ciudad');

var urlpatterns = patterns('',
    ['^/?$', 'doff.views.generic.simple.direct_to_template', {'template': 'index.html'} ],
    ['^ventas', include('agentes.apps.core.urls')]
)

// Don't touch this line
publish({ 
    urlpatterns: urlpatterns 
});
