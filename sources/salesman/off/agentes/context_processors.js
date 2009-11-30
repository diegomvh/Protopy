function pedido(request) {
    var pedido = null
    if (request.session.has_key('pedido'))
        pedido = request.session.get('pedido');
    return {'pedido': pedido};
}

publish({
	pedido: pedido
});