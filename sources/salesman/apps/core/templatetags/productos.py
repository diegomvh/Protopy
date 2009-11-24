from django import template
from salesman.apps.core.models import Categoria, Producto

register = template.Library()
@register.inclusion_tag("categorias.html")
def categorias():
    categorias = Categoria.objects.filter(super__isnull = True)
    return { "categorias": categorias }

@register.inclusion_tag("novedades.html", takes_context = True)
def novedades(context):
    novedades = Producto.objects.order_by('-pk')[0:5]
    return { "novedades": novedades, 'MEDIA_URL': context['MEDIA_URL'] }