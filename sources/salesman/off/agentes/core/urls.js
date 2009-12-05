require('doff.conf.urls', 'patterns');
require('agentes.core.models', '*');

var urlpatterns = patterns('doff.views.generic',     
        ['^$', 'simple.direct_to_template', {'template': 'administrar.html'}],
        
        // Editar una ciudad
        ['ciudad/(\\d{1,5})/editar/$', 'create_update.update_object', {
            'model': Ciudad,
            'post_save_redirect': '/administrar/ciudades/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Editar Ciudad', 'submit_text': 'Actualizar'} 
        }],
        
        // Listado de ciudades
        ['ciudades/$', 'list_detail.object_list',{
            'queryset': Ciudad.objects.all(),
            'extra_context': {'titulo': 'Listado de Ciudades'}
        }],
        
        ['ciudad/agregar/$', 'create_update.create_object', {
            'model': Ciudad,
            'post_save_redirect': '/administrar/ciudades/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Agregar Ciudad'}                                                                       
        }],
        
        // Ciudades -> Eliminar
        ['ciudad/(\\d{1,5})/eliminar/$', 'create_update.delete_object', {
            'model': Ciudad,
            'post_delete_redirect': '/administrar/ciudades/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Ciudad'}                                                                     
        }],
        
        // Clientes -> Edit
        ['cliente/(\\d{11})/editar/$', 'create_update.update_object', {
            'model': Cliente,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/clientes/',
            'extra_context': {'titulo': 'Editar Cliente', 'submit_text': 'Actualizar'}
        }],
        
        // Cliente -> Listar
        ['clientes/$', 'list_detail.object_list',{
            'queryset': Cliente.objects.all(),
            'extra_context': {'titulo': 'Listado de Clientes'}
        }],
        
        ['cliente/agregar/$', 'create_update.create_object', {
            'model': Cliente,
            'post_save_redirect': '/administrar/clientes/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Agregar Cliente'}                                                                      
        }],
        
        // Clientes -> Eliminar
        ['cliente/(\\d{11})/eliminar/$', 'create_update.delete_object', {
            'model': Cliente,
            'post_delete_redirect': '/administrar/clientes/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Cliente'}                                                                      
        }],
        
        // proveedor -> Edit
        ['^proveedor/(\\d{11})/editar/$', 'create_update.update_object',{
            'model': Proveedor,
            'post_save_redirect': '/administrar/proveedores/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Editar proveedor', 'submit_text': 'Actualizar'} 
        }],
        
        // proveedor -> Listar
        ['^proveedores/$', 'list_detail.object_list',{
            'queryset': Proveedor.objects.all(),
            'extra_context': {'titulo': 'Listado de Proveedores'}
        }],
        
        // proveedor -> Crear
        ['^proveedor/agregar/$', 'create_update.create_object', {
            'model': Proveedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/proveedores/',
            'extra_context': {'titulo': 'Agregar Proveedor'}
        }],
        
        // proveedor -> Eliminar
        ['^proveedor/(\\d{11})/eliminar/$', 'create_update.delete_object', {
            'model': Proveedor,
            'post_delete_redirect': '/administrar/proveedores/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Proveedor'}
        }]
);

publish({ 
    urlpatterns: urlpatterns 
});