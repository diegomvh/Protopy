from django import template
from simplejson import dumps
from copy import copy
from django.utils.safestring import SafeString
from django.utils.datastructures import SortedDict

register = template.Library()

@register.filter
def dict_popkey(d, key):
    val = None
    key = str(key)
    
    if d.has_key(key):
        val = d[key]
        d.pop(key)

    return val

dict_popkey.is_safe = True

@register.filter
def dict2json_filter(d, keys_to_filter = None):
    '''
    @param d: Dicitionary
    @param keys_to_filter: Comma separated keys to filter
    '''
    if keys_to_filter:
        print "--->", keys_to_filter
        keys_to_filter = keys_to_filter.split(',')
        keys_to_filter = map(lambda s: s.strip(), keys_to_filter)
    else:
        keys_to_filter = []
    
    d_cpy = copy(d)
    for key in keys_to_filter:
        if d_cpy.has_key(key):
            d_cpy.pop(key)
                    
    return SafeString(dumps(d_cpy))

dict2json_filter.is_safe = True

@register.filter
def get_key(h, key):
    try:
        return h[key]
    except KeyError:
        return key

@register.simple_tag
def get_model_definition(init_args):
    field_type, args = init_args
    verbose = ''
    my_args = SortedDict()
    for k, v in args.iteritems():
        if k == 'verbose_name':
            verbose = '"%s"' % v
        else:
            my_args[k] = v
        
    dump = u",".join([verbose, dumps(my_args)])
    dump = dump.strip(',')
    return SafeString(dump)

