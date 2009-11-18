require('doff.conf.urls', '*');

var urlpatterns = patterns('',
    // Example:
    ['^/?$', 'doff.views.generic.simple.direct_to_template', {'template': 'index.html'} ]
)

publish({ 
    urlpatterns: urlpatterns 
});