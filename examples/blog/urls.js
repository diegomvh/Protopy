// Top level offline url-to-view mapping.
require('doff.conf.urls', 'patterns', 'include');

var urlpatterns = patterns('',
    ['^$', 'doff.views.generic.simple.direct_to_template', {'template': 'index.html'} ],

    ['^blog/', include('blog.apps.post.urls')]
);

// Don't touch this line
publish({
    urlpatterns: urlpatterns 
});
