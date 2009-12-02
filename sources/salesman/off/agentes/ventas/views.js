require('doff.utils.http', 'HttpResponseRedirect', 'Http404');
require('doff.utils.shortcuts', 'get_object_or_404', 'render_to_response');
require('agentes.ventas.models', 'Pedido');
require('agentes.core.models', 'Producto', 'Cliente');
require('doff.template.context', 'RequestContext');

function terminar_pedido(sp, user) {
	debugger;
	var pedido = new Pedido();
    pedido.cliente = sp['cliente'];
    pedido.save();
    
    for each (var [id, item] in items(sp['items']))
        pedido.agregar_producto(item['producto'], item['cantidad']);
}

function armar_pedido(pedido, data, user) {
	debugger;
	if (user.is_staff && data['cliente']) {
        var cliente = get_object_or_404(Cliente, { cuit: Number(data['cliente']) });
        pedido['cliente'] = cliente;
	}
    var subtotal = 0.0;
    var productos = 0;
    var new_items = [];
    for each (var [id, item] in items(pedido['items'])) {
        var cantidad = Number(data['cantidad_%s'.subs(id)]);
        if (isNaN(cantidad))
            continue;
        if (data['quitar_%s'.subs(id)] || cantidad < 0)
            continue;
        else {
            item['cantidad'] = cantidad;
            item['importe'] = cantidad * item['producto'].precio;
            productos += cantidad;
            subtotal += Number(item['importe']);
        }
        new_items.push(item);
    }

    pedido['productos'] = productos
    pedido['items'] = object(new Dict(new_items.map(function (item) { return [item['producto'].id, item]; })));
    pedido['subtotal'] = subtotal;
    return pedido;
}

function agregar_producto(request, producto) {
	debugger;
    if (!request.session.has_key('pedido')) {
        var cliente = null;
        if (request.user.is_authenticated() && !request.user.is_staff)
            cliente = request.user;
        var pedido = {'cliente': cliente, 'items': {}, 'productos': 0, 'subtotal': 0.0};
    } else {
        var pedido = request.session.get('pedido');
    }
    
    var producto = get_object_or_404(Producto, {id: producto});
    
    if (!(producto.id in pedido['items']))
        pedido['items'][producto.id] = {'cantidad': 0, 'producto': producto, 'importe': 0};
    pedido['items'][producto.id]['cantidad'] += 1;
    pedido['items'][producto.id]['importe'] = pedido['items'][producto.id]['cantidad'] * producto.precio;
    pedido['subtotal'] += Number(pedido['items'][producto.id]['importe']);
    pedido['productos'] += 1;
    request.session.set('pedido', pedido);
    return ver_pedido(request, producto);
}

function modificar_pedido(request) {
	debugger;
	if (request.method != 'POST' || ! request.session.has_key('pedido'))
        return ver_pedido(request);
    
    var sp = armar_pedido(request.session.get('pedido'), request.REQUEST, request.user);
    
    if ('accion' in request.REQUEST && request.REQUEST['accion'] == 'Finalizar') {
        terminar_pedido(sp, request.user);
        request.session.unset('pedido');
        return new HttpResponseRedirect('/pedidos/');
    }
    
    request.session.set('pedido', sp);
    return ver_pedido(request);
}

function ver_pedido(request, producto) {
	debugger;
    if (!request.session.has_key('pedido') || len(request.session.get('pedido')['items']) == 0)
        return render_to_response('pedido.html', {}, new RequestContext(request));
    var pedido = request.session.get('pedido');
    var clientes = null;
    if (request.user.is_staff)
        clientes = Cliente.objects.all();
    return render_to_response('pedido.html', {'pedido': pedido, 'clientes': clientes, 'producto': producto}, new RequestContext(request));
}

function ver_pedidos(request) {
	if (!request.user.is_authenticated())
        throw new Http404();
    require('doff.views.generic.list_detail', 'object_list');
    var queryset = Pedido.objects.all();
    return object_list(request, { queryset: queryset });
}

publish({
	agregar_producto: agregar_producto,
	modificar_pedido: modificar_pedido,
	ver_pedido: ver_pedido,
    ver_pedidos: ver_pedidos
});