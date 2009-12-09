require('doff.conf.urls', '*');
require('blog.post.views');

var urlpatterns = patterns('',
    ['^add_tag/$', 'blog.post.views.add_tag'],
    ['^remove_tag/([A-Za-z0-9-]+)/$', 'blog.post.views.remove_tag'],
    ['^add_post/$', views.add_post],
    ['^remove_post/([A-Za-z0-9-]+)/$', views.remove_post]
);

publish({ 
    urlpatterns: urlpatterns 
});
