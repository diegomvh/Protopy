def pedido(request):
    pedido = None
    if request.session.has_key('pedido'):
        pedido = request.session['pedido']
    return {'current_pedido': pedido}
