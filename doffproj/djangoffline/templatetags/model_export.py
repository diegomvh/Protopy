from django import template
from simplejson import dumps
from copy import copy
from django.utils.safestring import SafeString
from django.utils.datastructures import SortedDict
from simplejson.encoder import JSONEncoder
from django.utils.functional import Promise
from django.utils.encoding import force_unicode
from django.db.models.fields.related import ManyToManyRel

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

class LazyEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, Promise):
            return force_unicode(o)
        elif isinstance(o, ManyToManyRel):
            return force_unicode(o.to._meta.object_name)
        else:
            return super(LazyEncoder, self).default(o)


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
        
    dump = u",".join([verbose, dumps(my_args, cls = LazyEncoder)])
    dump = dump.strip(',')
    return SafeString(dump)

