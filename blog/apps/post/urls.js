$L('doff.conf.urls', '*');
$L('blog.apps.post.views');

var urlpatterns = patterns('',
    ['^add_tag/$', 'blog.apps.post.views.add_tag'],
    ['^remove_tag/([A-Za-z0-9-]+)/$', 'blog.apps.post.views.remove_tag'],
    ['^show_posts/$', views.show_posts],
    ['^add_post/$', views.add_post]
);

$P({ 'urlpatterns': urlpatterns })
