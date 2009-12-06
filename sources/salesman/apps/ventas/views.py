from django.http import HttpResponseRedirect, Http404, HttpResponse
from django.shortcuts import get_object_or_404, render_to_response
from salesman.apps.ventas.models import Pedido
from salesman.apps.core.models import Producto, Cliente
from django.template.context import RequestContext

def terminar_pedido(sp, user):
    pedido = Pedido()
    pedido.vendedor = user
    pedido.cliente = sp['cliente']
    pedido.save()
    
    for id, item in sp['items'].iteritems():
        pedido.agregar_producto(item['producto'], item['cantidad'])

def armar_pedido(pedido, data, user):
    if user.is_staff and data.has_key('cliente'):
        cliente = get_object_or_404(Cliente, cuit = int(data['cliente']))
        pedido['cliente'] = cliente
    
    subtotal = 0.0
    productos = 0 
    items = []
    for id, item in pedido['items'].iteritems():
        try:
            cantidad = int(data['cantidad_%s' % id])
        except ValueError:
            continue
        if data.has_key('quitar_%s' % id) or cantidad < 0:
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
    return pedido

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
    return ver_pedido(request, producto)

def modificar_pedido(request):
    if request.method != 'POST' or 'pedido' not in request.session:
        return ver_pedido(request)
    
    sp = armar_pedido(request.session['pedido'], request.REQUEST, request.user)
    
    print dir(request.POST)
    print "-" * 40
    print dir(request.REQUEST)
    if request.REQUEST.has_key('accion') and request.REQUEST['accion'] == 'Finalizar':
        terminar_pedido(sp, request.user)
        del request.session['pedido']
        return HttpResponseRedirect('/pedidos/')
    
    request.session['pedido'] = sp
    return ver_pedido(request)

def ver_pedido(request, producto = None):
    if 'pedido' not in request.session or len(request.session['pedido']['items']) == 0:
        return render_to_response('pedido.html', {}, context_instance = RequestContext(request))
    pedido = request.session['pedido']
    clientes = None
    if request.user.is_staff:
        clientes = Cliente.objects.all()
    return render_to_response('pedido.html', {'pedido': pedido, 'clientes': clientes, 'producto': producto}, context_instance = RequestContext(request))

def ver_pedidos(request):
    if not request.user.is_authenticated():
        raise Http404()
    from django.views.generic.list_detail import object_list
    queryset = request.user.pedido_set.all()
    return object_list(request, queryset = queryset)
    
def ver_pedido_por_id(request, id):
    pedido = get_object_or_404(Pedido, id = id)
    return render_to_response('ver_pedido.html', locals(),
                              context_instance = RequestContext(request))
