from django.http import HttpResponseRedirect, Http404
from django.shortcuts import get_object_or_404, render_to_response, redirect
from salesman.apps.ventas.models import Pedido
from salesman.apps.core.models import Producto
from django.template.context import RequestContext
    
def agregar_producto(request, producto):
    if 'pedido' not in request.session:
        cliente = None
        if request.user.is_authenticated() and not request.user.is_staff:
            cliente = request.user
        pedido = {'cliente': cliente, 'items': {}, 'productos': 0, 'subtotal': 0.0}
    else:
        pedido = request.session['pedido']

    producto = get_object_or_404(Producto, id = producto)
    
    if not pedido['items'].has_key(producto.id):
        pedido['items'][producto.id] = {'cantidad': 0, 'producto': producto, 'importe': 0}
    pedido['items'][producto.id]['cantidad'] += 1
    pedido['items'][producto.id]['importe'] = pedido['items'][producto.id]['cantidad'] * producto.precio
    pedido['subtotal'] += float(pedido['items'][producto.id]['importe'])
    pedido['productos'] += 1
    request.session['pedido'] = pedido
    return render_to_response('pedido.html', {'pedido': pedido, 'producto': producto}, context_instance = RequestContext(request))

def modificar_pedido(request):
    if request.method != 'POST' or 'pedido' not in request.session:
        return ver_pedido(request)
    pedido = request.session['pedido']
    
    subtotal = 0.0
    productos = 0 
    items = []
    for id, item in pedido['items'].iteritems():
        try:
            cantidad = int(request.REQUEST['cantidad_%s' % id])
        except ValueError:
            continue
        if request.REQUEST.has_key('quitar_%s' % id) or cantidad < 0:
            continue
        else:
            item['cantidad'] = cantidad
            item['importe'] = cantidad * item['producto'].precio
            productos += cantidad
            subtotal += float(item['importe'])
        items.append(item)

    pedido['productos'] = productos
    pedido['items'] = dict(map(lambda item: (item['producto'].id, item), items))
    pedido['subtotal'] = subtotal
    
    request.session['pedido'] = pedido
    return ver_pedido(request)

def ver_pedido(request):
    if 'pedido' not in request.session or len(request.session['pedido']['items']) == 0:
        return render_to_response('pedido.html', {}, context_instance = RequestContext(request))
    pedido = request.session['pedido']
    return render_to_response('pedido.html', {'pedido': pedido}, context_instance = RequestContext(request))

