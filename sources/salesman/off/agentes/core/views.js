require('agentes.core.models', 'Categoria', 'Producto');
require('doff.utils.shortcuts', 'get_object_or_404', 'render_to_response', 'redirect');
require('doff.template.context', 'RequestContext');

function productos_por_categoria(request, categoria) {
    var supercategoria = get_object_or_404(Categoria, { id: categoria});
    while (supercategoria.super != null)
        supercategoria = supercategoria.super;
    function lista_categorias(sup) {
        var subcategorias = sup.categoria_set.all();
        var resultado = [sup];
        for (var categoria in subcategorias)
        	resultado = resultado.concat(lista_categorias(categoria));
        return resultado;
    }
    var categorias = lista_categorias(supercategoria);
    categorias = categorias.filter(function(c) { return c.producto_set.count() > 0; });
    return render_to_response('productos.html', {'categorias': categorias}, new RequestContext(request));  
}

function buscar_productos(request) {
    if (request.method == "POST" && len(request.REQUEST['quicksearch']) >= 3) {
        var productos = Producto.objects.filter({ nombre__icontains: request.REQUEST['quicksearch'] });
        var categorias = new Set();
        for (var producto in productos)
            categorias.add(producto.categoria);
        return render_to_response('productos.html', {'categorias': categorias}, new RequestContext(request));
    }
    return redirect('/');
}

publish({ 
	productos_por_categoria: productos_por_categoria,
	buscar_productos: buscar_productos
});
