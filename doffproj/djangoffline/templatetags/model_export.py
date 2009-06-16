from django import template

register = template.Library()

@register.filter
def dict_popkey(d, key):
    print d
    val = None
    if d.has_key(key):
        val = d[key]
        d.pop(key)
    print val
    return val
        

dict_popkey.is_safe = True


