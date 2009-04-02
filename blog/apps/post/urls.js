$L('doff.conf.urls', '*');

var urlpatterns = patterns('',
    ['^add_tag/$', 'blog.apps.post.views.add_tag'],
    ['^remove_tag/([A-Za-z0-9-]+)/$', 'blog.apps.post.views.remove_tag']
);

$P({ 'urlpatterns': urlpatterns })
