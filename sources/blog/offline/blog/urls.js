require('doff.conf.urls', '*');
require('blog.views', 'index');

var urlpatterns = patterns('',
    // Example:
    ['^$', index],
    ['^', include('blog.post.urls')]
)

publish({ 
    urlpatterns: urlpatterns 
});