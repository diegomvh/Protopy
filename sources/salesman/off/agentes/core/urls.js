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
        ['cliente/(\\d{1,5})/editar/$', 'create_update.update_object',{
            'model': Cliente,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/clientes/',
            'extra_context': {'title': 'Editar Cliente', 'submit_text': 'Actualizar'}
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
        ['cliente/(\\d{1,5})/eliminar/$', 'create_update.delete_object', {
            'model': Cliente,
            'post_delete_redirect': '/administrar/clientes/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Cliente'}                                                                      
        }],
        
        // productos -> Edit
        ['producto/(\\d{1,5})/editar/$', 'create_update.update_object',{
            'model': Producto,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/productos/',
            'extra_context': {'title': 'Editar Producto', 'submit_text': 'Actualizar'} 
        }],
        
        // producto -> Listar
        ['productos/$', 'list_detail.object_list', {
            'queryset': Producto.objects.all(),
            'extra_context': {'titulo': 'Listado de Productos'}
        }],
        
        // producto -> Crear
        ['producto/agregar/$', 'create_update.create_object', {
            'model': Producto,
            'template_name': 'forms.html',
            'post_save_redirect': '/core/productos/',
            'extra_context': {'titulo': 'Agregar Producto'}               
        }],
        
        // Producto -> Eliminar
        ['producto/(\\d{1,5})/eliminar/$', 'create_update.delete_object', {
            'model': Producto,
            'post_delete_redirect': '/administrar/productos/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Producto'}                                                              
        }],
        
        ['^proveedor/$', 'simple.redirect_to', {'url':'/core/proveedores/'}],
        
        // vendedors -> Edit
        ['^proveedor/(\\d{1,5})/edit/$', 'create_update.update_object',{
            'model': Proveedor,
            'post_save_redirect': '/administrar/proveedores/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar proveedor', 'submit_text': 'Actualizar'} 
        }],
        
        // proveedor -> Listar
        ['^proveedores/$', 'list_detail.object_list',{
            'queryset': Proveedor.objects.all()
        }],
        
        // proveedor -> Crear
        ['^proveedores/add/$', 'simple.redirect_to', {
        	'url': '../../proveedor/add/'
        }],
            
        ['^proveedor/add/$', 'create_update.create_object', {
            'model': Proveedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/proveedores/'                                                                      
        }],
        // proveedor -> Eliminar
        ['^proveedor/(\\d{1,5})/delete/$', 'create_update.delete_object', {
            'model': Proveedor,
            'post_delete_redirect': '/administrar/proveedores/',
            'template_name': 'confirm_delete.html'                                                                     
        }],
        
        // vendedors -> Edit
        ['categoria/(\\d{1,5})/editar/$', 'create_update.update_object',{
            'model': Categoria,
            'post_save_redirect': '/administrar/categorias/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar Categoria', 'submit_text': 'Actualizar'} 
        }],
        
        // categoria -> Listar
        ['categorias/$', 'list_detail.object_list',{
            'queryset': Categoria.objects.all(),
            'extra_context': {'titulo': 'Listado de Categorias'}  
        }],
        
        // categoria -> Crear
        ['^categoria/agregar/$', 'create_update.create_object', {
            'model': Categoria,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/categorias/',
            'extra_context': {'titulo': 'Agregar Categoria'}                                                                     
        }],
        
        // categoria -> Eliminar
        ['^categoria/(\\d{1,5})/eliminar/$', 'create_update.delete_object', {
            'model': Categoria,
            'post_delete_redirect': '/administrar/categorias/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Categoria'}                            
        }]
);

publish({ 
    urlpatterns: urlpatterns 
});