require('doff.conf.urls', '*');
require('blog.views', 'index', 'removedb');

var urlpatterns = patterns('',
    // Example:
    ['^$', index],
    ['^syncdb/$', 'blog.views.syncdb'],
    ['^removedb/$', removedb],
    ['^blog/', include('blog.apps.post.urls')]
)

publish({ 
    urlpatterns: urlpatterns 
});