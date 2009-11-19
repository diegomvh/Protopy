from django import template
from django.conf import settings
from salesman.apps.core.models import Categoria, Producto

register = template.Library()
@register.inclusion_tag("catalogo.html")
def catalogo():
    categorias = Categoria.objects.filter(super__isnull = True)
    return { "categorias": categorias }