'''
In order to generate Javascript representation of Django models
doff analyzes Field subclasses constructors. Each contructor has
a set of arguments that are stored as instance attributes in almost
every django.db.models.fields.Field subclass.

This module scans for Field definitions in every app listed in
settings.INSTALLED_APPS. Also it tries to discover Field subclasses.

Thre are some parameters that can't be guessed from constructor arguments,
in those cases a ModelProxy class should be defined.

'''

#FIELD_DATA = {
#    'BaseField': 
#                  ['required', 'widget', 'label', 'initial', 'help_text', 
#                   'error_messages', 'show_hidden_initial'],
#    'CharField': [ 'max_length', 'min_length', ],
#    'IntegerField': ['max_value', 'min_value'],
#    'FloatField' 
#              
#}


from django.utils.datastructures import SortedDict
import sys
from django.conf import settings
from inspect import isclass, ismodule

python_version = map(int, sys.version.split(' ')[0].split('.'))
if python_version < (2, 6, 0):
    from djangoffline.utils import namedtuple
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
        return str(self._arg_spec)
    
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


    
    

def get_model_class_fields():
    '''
    Loads Django ORM's fields
    '''
    
    mod = __import__('django.db.models', {}, {}, ['*'])
    classes = [ (name, class_) for name, class_ in mod.__dict__.items() 
                    if filter_field(class_)
              ]
    model_class_fields = SortedDict() 
    for name, class_ in classes:
        model_class_fields[name] = FieldIntrospection(class_)
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
                f_introspect = model_class_fields[field_type]
                processed_fields[f.name] = (field_type, f_introspect.get_init_args(f))
            except KeyError:
                #TODO: Implement for more fields
                processed_fields[f.name] = (field_type, "Unsupported")
        
        processed_models[name] = processed_fields
    return processed_models



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
        print mod
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

def analize_mod(mod, filter_callback = None):
    
    assert ismodule(mod), "Must receive a module, got %s instead" % type(mod)
    pass
        
def get_fields_from_apps(filter_callback = filter_field):
    '''
    Loads Django ORM's fields
    '''
    from django.db.models.loading import get_apps
    for app in get_apps():
        #print app
        for name, element in app.__dict__.iteritems():
            if ismodule(element):
                if not name in SYSTEM_MODULES:
                    print name
                    
            if filter_field(element):
                print name
            else:
                print type(element)
    
    