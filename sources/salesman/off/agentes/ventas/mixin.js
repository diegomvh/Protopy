require('agentes.core.models', 'Producto');

var Pedido = {
	agregar_producto: function(producto, cantidad) {
    	cantidad = cantidad || 1;
        assert(isinstance(producto, Producto), '%s no es un producto'.subs(producto));
        var item = new ItemPedido();
        item.producto = producto;
        item.cantidad = cantidad;
        item.precio = producto.precio * cantidad;
        this.itempedido_set.add(item);
    }
};

publish({
	Pedido: Pedido
});
 