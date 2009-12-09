// Top level offline url-to-view mapping.
require('doff.conf.urls', 'patterns', 'include');
require('blog.apps.post.models', 'Post');

var urlpatterns = patterns('',
    ['^$', 'doff.views.generic.simple.direct_to_template', {'template': 'index.html'} ],
 
    ['post/(\\d{1,5})/edit/$', 'create_update.update_object', {
        'model': Post,
        'post_save_redirect': '/posts/',
        'template_name': 'forms.html',
        'extra_context': {'titulo': 'Editar Post', 'submit_text': 'Actualizar'} 
    }],
    
    ['posts/$', 'list_detail.object_list',{
        'queryset': Post.objects.all(),
        'extra_context': {'titulo': 'Listado de Posts'}
    }],
    
    ['post/add/$', 'create_update.create_object', {
        'model': Post,
        'post_save_redirect': '/posts/',
        'template_name': 'forms.html',
        'extra_context': {'titulo': 'Agregar Post'}                                                                       
    }],
    
    ['post/(\\d{1,5})/del/$', 'create_update.delete_object', {
        'model': Post,
        'post_delete_redirect': '/posts/',
        'template_name': 'confirm_delete.html',
        'extra_context': {'titulo': 'Eliminar Post'}                                                                     
    }]
);

// Don't touch this line
publish({ 
    urlpatterns: urlpatterns 
});
