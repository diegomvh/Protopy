from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render_to_response
from salesman.apps.ventas.models import Pedido
from salesman.apps.core.models import Producto
from django.template.context import RequestContext

def create_pedido(request, object_id = None, **kwargs):
    if request.method == "POST":
        form = PedidoForm(data = request.POST)
        if form.is_valid():
            pedido = form.save()
            pedido_id = pedido.id
            formset = PedidoConItemsForm(data = request.POST, instance = pedido)
            if formset.is_valid():
                instances = formset.save()
                # Una vez creado por primera vez, se redirecciona al edit
                if not object_id:
                    return HttpResponseRedirect('../%d/edit/' % pedido_id)
        else:
            formset = PedidoConItemsForm()
    else:
        form = PedidoForm()
        formset = PedidoConItemsForm()
    
    return render_to_response('ventas/pedido_form.html', locals())

def edit_pedido(request, object_id):
    pedido = get_object_or_404(Pedido, id = object_id)
    if request.method == "POST":
        form = PedidoForm(data = request.POST, instance = pedido)
        if form.is_valid():
            pedido = form.save()
        
        formset = PedidoConItemsForm(request.POST, instance = pedido)
        if formset.is_valid():
            instances = formset.save()
            if request.POST.has_key('save'):
                return HttpResponseRedirect('../..')
            else:
                formset = PedidoConItemsForm(instance = pedido)
    else:
        form = PedidoForm(instance = pedido)
        formset = PedidoConItemsForm(instance = pedido)
    return render_to_response('ventas/pedido_form.html', locals())
    
def agregar_producto(request, producto):
    if 'pedido' not in request.session:
        pedido = {'cliente': None, 'items': {}}
    else:
        pedido = request.session['pedido']

	producto = get_object_or_404(Producto, id = producto)
    if not pedido['items'].has_key(producto.id):
        pedido['items'][producto.id] = {'cantidad': 0, 'producto': producto, 'importe': 0}
    pedido['items'][producto.id]['cantidad'] += 1
    pedido['items'][producto.id]['importe'] = pedido['items'][producto.id]['cantidad'] * producto.precio
    request.session['pedido'] = pedido
    return render_to_response('pedido.html', {'pedido': pedido, 'producto': producto}, context_instance = RequestContext(request))