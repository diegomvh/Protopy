$L('doff.conf.urls', '*');
$L('blog.views', 'index', 'removedb');

var urlpatterns = patterns('',
    // Example:
    ['^$', index],
    ['^syncdb/$', 'blog.views.syncdb'],
    ['^removedb/$', removedb],
    ['^blog/', include('blog.apps.post.urls')]
)

$P({ 'urlpatterns': urlpatterns });
