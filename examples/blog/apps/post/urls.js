require('doff.conf.urls', '*');
require('blog.apps.post.models', 'Post', 'Tag');

var urlpatterns = patterns('',
    ['^$', 'doff.views.generic.simple.direct_to_template', {'template': 'blog.html'} ],

    ['post/(\\d{1,5})/edit/$', 'doff.views.generic.create_update.update_object', {
        'model': Post,
        'post_save_redirect': '/posts/',
        'template_name': 'form.html',
        'extra_context': {'titulo': 'Edit Post', 'submit_text': 'Update'} 
    }],

    ['posts/$', 'doff.views.generic.list_detail.object_list',{
        'queryset': Post.objects.all(),
        'extra_context': {'titulo': 'All Posts'}
    }],

    ['post/add/$', 'doff.views.generic.create_update.create_object', {
        'model': Post,
        'post_save_redirect': '/posts/',
        'template_name': 'form.html',
        'extra_context': {'titulo': 'Add Post'}
    }],

    ['post/(\\d{1,5})/remove/$', 'doff.views.generic.create_update.delete_object', {
        'model': Post,
        'post_delete_redirect': '/posts/',
        'template_name': 'confirm_delete.html',
        'extra_context': {'titulo': 'Remove Post'}
    }],

    ['tag/(\\d{1,5})/edit/$', 'doff.views.generic.create_update.update_object', {
        'model': Tag,
        'post_save_redirect': '/posts/',
        'template_name': 'form.html',
        'extra_context': {'titulo': 'Edit Post', 'submit_text': 'Update'} 
    }],

    ['tags/$', 'doff.views.generic.list_detail.object_list',{
        'queryset': Tag.objects.all(),
        'extra_context': {'titulo': 'All Posts'}
    }],

    ['tag/add/$', 'doff.views.generic.create_update.create_object', {
        'model': Tag,
        'post_save_redirect': '/posts/',
        'template_name': 'form.html',
        'extra_context': {'titulo': 'Add Post'}
    }],

    ['tag/(\\d{1,5})/remove/$', 'doff.views.generic.create_update.delete_object', {
        'model': Tag,
        'post_delete_redirect': '/posts/',
        'template_name': 'confirm_delete.html',
        'extra_context': {'titulo': 'Remove Post'}
    }]
);

publish({ 
    urlpatterns: urlpatterns 
});
