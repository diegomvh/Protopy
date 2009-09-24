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
import sys
from django.conf import settings
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
        for index, f_name in enumerate(self._arg_spec.args[1:]):
            f_value = getattr(field, f_name, None)
            if self._arg_spec.defaults:
                if f_value and f_value != self._arg_spec.defaults[index]:
                    args[f_name] = f_value
        return args

def get_class_bases(cls, results = None):
    if not isclass(cls):
        cls = cls.__class__
        
    # First run, include me and my parents
    if not results:
        results = [ cls, ]
        
    results += list(cls.__bases__)
    #print results
    # Got to roots?
#    if len(cls.__bases__) == 1 and type(cls.__bases__[0]) in [object, type]:
#        print "Coratando por llegar a type, estamos en %s" % cls
#        
#        return results
    # Try this code
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

def export_models(models):
    '''
    Export model definition
    '''
    processed_models = SortedDict()
    for model in models:
        name = model._meta.object_name
        fields = model._meta.fields + model._meta.many_to_many
        processed_fields = SortedDict()
        for f in fields:
            field_type = f.__class__.__name__
            try:
                bases = get_class_bases(f)
                args = SortedDict()
                for base in bases:
                    try:
                        f_introspect = model_class_fields[base]
                    except:
                        pass
                    else:
                        args.update( f_introspect.get_init_args(f) )
                
                processed_fields[f.name] = (field_type, args )
                #f_introspect = model_class_fields[f.__class__]
                #processed_fields[f.name] = (field_type, f_introspect.get_init_args(f))
            except KeyError, e:
                #TODO: Implement for more fields
                processed_fields[f.name] = (field_type, {})
        
        processed_models[name] = processed_fields
    #print processed_models
    return processed_models

def export_remotes(remote_model_proxies):
    processed_models = SortedDict()
    for remote in remote_model_proxies:
        print remote
        model = remote._meta.model
        name = model._meta.object_name
        fields = model._meta.fields + model._meta.many_to_many + remote._meta.fields
        
        processed_fields = SortedDict()
        for f in fields:
            field_type = f.__class__.__name__
            try:
                bases = get_class_bases(f)
                args = SortedDict()
                for base in bases:
                    try:
                        f_introspect = model_class_fields[base]
                    except:
                        pass
                    else:
                        args.update( f_introspect.get_init_args(f) )
                
                processed_fields[f.name] = (field_type, args )
                #f_introspect = model_class_fields[f.__class__]
                #processed_fields[f.name] = (field_type, f_introspect.get_init_args(f))
            except KeyError, e:
                #TODO: Implement for more fields
                processed_fields[f.name] = (field_type, {})
        
        processed_models[name] = processed_fields
    #print processed_models
    return processed_models

#===============================================================================
# Broken Code, 
#===============================================================================
SYSTEM_MODULES = ['os', 'sys', 'type', ]

def module_explore(mod, filter_callback = None):
    assert ismodule(mod), "No es un modulo"
    for name, element in mod.__dict__.iteritems():
        if name.startswith('__'):
            print "Skip", name
            continue
        
        if ismodule(element) and not element.__name__ not in SYSTEM_MODULES:
            try:
                for el in module_explore(element, filter_callback):
                    yield el
            except RuntimeError:
                #print element.__name__
                print "Runtime error in %s" % mod
                
            continue
        
        if callable(filter_callback):
            if filter_callback(element):
                yield element
        else:
            yield element
app_models = map(lambda s: "%s.models" % s, settings.INSTALLED_APPS)
 
def modules_explore(modules = app_models, 
                    filter_callback = filter_field ):
    '''
    Returns the elemements contained in modules filtered by
    the callback funcion.
    @param moduules: List of modules or module names
    @param filter_callback:
    '''
    # Check which modules have already been visited
    modules_explored = set()
    for mod in modules:
        #print mod
        if not ismodule(mod):
            try:
                mod = __import__(mod, {}, {}, ['*', ] )
            except ImportError, err:
                print "No existe %s" % err 
        if mod in modules_explored:
            continue
        
        for element in module_explore(mod, filter_callback):
            yield element
        modules_explored.add(mod)

def analize_mod(mod, filter_callback = None, analized = None):
    assert ismodule(mod), "Must receive a module, got %s instead" % type(mod)
    if not analized:
        analized = []
    
    findings = []
    #print mod
    for name, el in mod.__dict__.iteritems():
        if name.startswith('_'):
            continue
        elif filter_callback(el):
            findings.append(el)
    return findings
        
def get_fields_from_apps(filter_callback = filter_field):
    '''
    Loads Django ORM's fields
    '''
    from django.db.models.loading import get_apps
    fields = set()
    
    for app in get_apps():
        fields.update( analize_mod(app, filter_callback))
    #print fields
    
#from django.db.models.loading import get_app, get_models

related_class = lambda relation: relation.rel.to
 
def get_model_order(model_lists):
    from django.db import models
    model_adj = SortedDict()
    for model in model_lists:
        #model_adj[model] = filter(lambda f: f
        fks = filter(lambda f: isinstance(f, models.ForeignKey), model._meta.fields)
        fks = map(related_class, fks)
        
        model_adj[ model ]  = fks + map(related_class, model._meta.many_to_many)
    
    order = filter(lambda m: not model_adj[m], model_adj.keys())
    
    while len(order) < len(model_adj):
        for model in model_adj:
            if model in order:
                continue
            deps = model_adj[model]
            if all(map(lambda d: d in order, deps)):
                order.append(model)
    return order
    
def model_order_for_app(app_label):
    from django.db.models.loading import get_app, get_models
    models = get_models(get_app(app_label))
    return get_model_order(models)




    
    