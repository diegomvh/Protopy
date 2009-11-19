require('doff.template.base', 'Library');
require('agentes.core.models', 'Categoria', 'Producto');

register = new Library();
function catalogo() {
    categorias = Categoria.objects.filter({ super__isnull: true });
    return { "categorias": categorias };
}

register.inclusion_tag("catalogo.html")(catalogo);

publish({
	register: register
});