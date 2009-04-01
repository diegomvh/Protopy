$L('doff.conf.urls', '*');
$L('blog.views', 'index');

var urlpatterns = patterns('',
    // Example:
    ['^/$', index],
    ['^blog/', include('blog.apps.post.urls')],
)

$P({ 'urlpatterns': urlpatterns })
