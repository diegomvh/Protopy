require('doff.template.base', 'Library');
require('agentes.core.models', 'Categoria', 'Producto');

var register = new Library();
function categorias() {
    var categorias = Categoria.objects.filter({ super__isnull: true });
    return { "categorias": categorias };
}
register.inclusion_tag("categorias.html")(categorias);

function novedades(context) {
	var novedades = Producto.objects.order_by('-pk').slice(1, 6);
    return { "novedades": novedades, 'MEDIA_URL': context.get('MEDIA_URL') };
}
register.inclusion_tag("novedades.html", { takes_context: true })(novedades);

publish({
	register: register
});