from salesman.apps.core.models import Categoria, Producto
from django.shortcuts import get_object_or_404, render_to_response, redirect
from django.template.context import RequestContext

def productos_por_categoria(request, categoria):
    supercategoria = get_object_or_404(Categoria, id = categoria)
    while supercategoria.super != None:
        supercategoria = supercategoria.super
    def lista_categorias(super):
        subcategorias = super.categoria_set.all()
        resultado = [super]
        for categoria in subcategorias:
            resultado.extend(lista_categorias(categoria))
        return resultado 
    categorias = lista_categorias(supercategoria)
    categorias = filter(lambda c: c.producto_set.count() > 0, categorias)
    return render_to_response('productos.html', {'categorias': categorias}, context_instance=RequestContext(request))

def buscar_productos(request):
    if request.method == "POST" and len(request.REQUEST['quicksearch']) >= 3:
        productos = Producto.objects.filter(nombre__icontains = request.REQUEST['quicksearch'])
        categorias = set()
        for producto in productos:
            categorias.add(producto.categoria)
        return render_to_response('productos.html', {'categorias': categorias}, context_instance=RequestContext(request))
    return redirect('/')
