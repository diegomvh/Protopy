require('doff.conf.urls', '*');
require('blog.views', 'index');

var urlpatterns = patterns('',
    // Example:
    ['^blog/$', index],
    ['^blog/', include('blog.post.urls')]
)

publish({ 
    urlpatterns: urlpatterns 
});