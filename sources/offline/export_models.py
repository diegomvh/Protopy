'''
In order to generate Javascript representation of Django models
doff analyzes Field subclasses constructors. Each contructor has
a set of arguments that are stored as instance attributes in almost
every django.db.models.fields.Field subclass.

This module scans for Field definitions in every app listed in
settings.INSTALLED_APPS. Also it tries to discover Field subclasses.

Thre are some parameters that can't be guessed from constructor arguments,
in those cases a ModelProxy class should be defined.

First Approach:
Store a dictionary of every possible attribute


Last Approach:
Get django field definition letting the user to register his/her custom
models.

Lastest Approach:

'''

from django.utils.datastructures import SortedDict
from pprint import pformat
import sys
from django.conf import settings
from django.db.models import AutoField, ForeignKey, ManyToManyField
from inspect import isclass, ismodule

python_version = map(int, sys.version.split(' ')[0].split('.'))

if python_version < (2, 6, 0):
    from offline.util import namedtuple
    import inspect
    ArgSpec = namedtuple('ArgSpec', 'args varargs keywords defaults')
    
    def getargspec(func):
        """Get the names and default values of a function's arguments.
    
        A tuple of four things is returned: (args, varargs, varkw, defaults).
        'args' is a list of the argument names (it may contain nested lists).
        'varargs' and 'varkw' are the names of the * and ** arguments or None.
        'defaults' is an n-tuple of the default values of the last n arguments.
        """
    
        if inspect.ismethod(func):
            func = func.im_func
        if not inspect.isfunction(func):
            raise TypeError('arg is not a Python function')
        args, varargs, varkw = inspect.getargs(func.func_code)
        return ArgSpec(args, varargs, varkw, func.func_defaults)
    
else:
    from inspect import getargspec

# Filter field
from django.db.models import Field
#from django.db.models.related import 
filter_field = lambda c: isclass(c) and issubclass(c, Field)


class FieldIntrospection(object):
    '''
    Helper for introspection issues
    '''
    def __init__(self, class_):
        self._class = class_
        constructor = getattr(class_, '__init__')
        self._arg_spec = getargspec(constructor)
        
    def __getattr__(self, name):
        if hasattr(self._arg_spec, name):
            return getattr(self._arg_spec, name)
        
    def __str__(self):
        #return str(self._arg_spec) # Demaciado verboragico
        return "<Argspec for %s>" % self._class.__name__
        
    __repr__ = __str__ 
    
    def get_init_args(self, field):
        args = SortedDict()
        #args = []
        # We start from 1: since we want to skip
        print self._arg_spec.defaults
        for index, f_name in enumerate(self._arg_spec.args[1:]):
            f_value = getattr(field, f_name, None)
            if self._arg_spec.defaults:
                if f_value != None and f_value != "" and f_value != [] and f_value != self._arg_spec.defaults[index]:
                    args[f_name] = f_value
        return args

def get_class_bases(cls, results = None):
    if not isclass(cls):
        cls = cls.__class__
        
    # First run, include me and my parents
    if not results:
        results = [ cls, ]
        
    results += list(cls.__bases__)
    for parent_cls in cls.__bases__:
        if parent_cls in (type, object):
            continue
        get_class_bases(parent_cls, results)
    return filter(lambda obj: obj not in (type, object), results)
        
     
FIELD_LOOKUP_MODULES = ('django.db.models', 'django.db.models.fields.related', )
def get_model_class_fields():
    '''
    Loads Django ORM's fields
    '''
    model_class_fields = SortedDict()
    for mod_name in FIELD_LOOKUP_MODULES:
        #print "lookup %s" % mod_name
        mod = __import__(mod_name, {}, {}, ['*'])
        classes = [ (name, class_) for name, class_ in mod.__dict__.items() 
                    if filter_field(class_)
                    ]
         
        for name, class_ in classes:
            model_class_fields[class_] = FieldIntrospection(class_)
    
    return model_class_fields

# Cache
model_class_fields = get_model_class_fields()

def export_remotes(models_and_proxies):
    '''
    @param models_and_proxies: {
                                    Model: RemoteProxy,
                                    Model: RemoteProxy
                                }
                    ... }
                                        
    @return: Diccionario ordenado con remote -> {nombre_camo: valor_inicializacion_constructor} 
    
    '''
    models = models_and_proxies.keys()
    sorted_models = get_model_order(models)
    
    processed_models = SortedDict()
    
    for model in sorted_models:
        remote = models_and_proxies[model]
        fields = remote.base_fields
        processed_fields = SortedDict()
        for name, field in fields.iteritems():
            if isinstance(field, AutoField): continue
            
            field_type = field.__class__.__name__
            try:
                bases = get_class_bases(field)
                args = SortedDict()
                for base in bases:
                    try:
                        f_introspect = model_class_fields[base]
                    except:
                        pass
                    else:
                        args.update( f_introspect.get_init_args(field) )
                
                processed_fields[name] = (field_type, args )
                #f_introspect = model_class_fields[f.__class__]
                #processed_fields[f.name] = (field_type, f_introspect.get_init_args(f))
            except KeyError, e:
                #TODO: Implement for more fields
                processed_fields[name] = (field_type, {})
        
        processed_models[model] = processed_fields
    return processed_models

related_class = lambda relation: relation.rel.to
 
def get_model_order(model_lists):
    
    model_adj = SortedDict()
    for model in model_lists:
        model_adj[ model ]  = get_related_models(model)
    
    order = filter(lambda m: not bool(model_adj[m]), model_adj.keys())
    map(lambda m: model_adj.pop(m), order) 
    # TODO: Detect encadenamiento y resolverlo
    while model_adj:
        for model in model_adj:
            deps = model_adj[model]

            if all(map(lambda d: d not in model_adj, deps)):
                order.append(model)
                model_adj.pop(model)
    return order
    
def model_order_for_app(app_label):
    from django.db.models.loading import get_app, get_models
    models = get_models(get_app(app_label))
    return get_model_order(models)

def get_related_models(model):
    fks = filter(lambda f: isinstance(f, ForeignKey), model._meta.fields)
    fks = map(related_class, fks)
        
    return fks + map(related_class, model._meta.many_to_many)

def get_related_apps(models):
    apps = []
    for m in models:
        ms = get_related_models(m)
        apps += map(lambda m: m._meta.app_label, ms)
    return set(apps)