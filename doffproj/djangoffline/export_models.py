

#FIELD_DATA = {
#    'BaseField': 
#                  ['required', 'widget', 'label', 'initial', 'help_text', 
#                   'error_messages', 'show_hidden_initial'],
#    'CharField': [ 'max_length', 'min_length', ],
#    'IntegerField': ['max_value', 'min_value'],
#    'FloatField' 
#              
#}

from inspect import isclass, getargspec
from django.utils.datastructures import SortedDict

import sys
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
    #global model_class_fields
    from django.db.models import Field
    filter_field = lambda c: isclass(c) and issubclass(c, Field)
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

from inspect import ismodule

SYSTEM_MODULES = ['os', 'sys', 'type', ]

def module_explore(mod, filter_callback = None):
    assert ismodule(mod), "No es un modulo"
    for element in mod.__dict__.values():
        if ismodule(element) and not element.__name__ not in SYSTEM_MODULES:
            try:
                for el in module_explore(element, filter_callback):
                    yield el
            except RuntimeError:
                #print element.__name__
                pass
            continue
        
        if callable(filter_callback):
            if filter_callback(element):
                yield element
        else:
            yield element
        
def modules_explore(modules, filter_callback = None):
    '''
    Returns the elemements contained in modules filtered by
    the callback funcion.
    @param moduules: List of modules or module names
    @param filter_callback:
    '''
    # Check which modules have already been visited
    modules_explored = set()
    for mod in modules:
        if not ismodule(mod):
            mod = __import__(mod, {}, {}, ['*', ] )
        if mod in modules_explored:
            continue
        
        for element in module_explore(mod, filter_callback):
            yield element
        modules_explored.add(mod)
        
        
def get_model_fields_by_class():
    '''
    Loads Django ORM's fields
    '''
    from django.conf import settings
    from django.db.models import Field
    
    filter_field = lambda c: isclass(c) and issubclass(c, Field)
    
    field_instrospect = SortedDict()
    
    for app in settings.INSTALLED_APPS:
        models_mod_name = app + '.models'
        try:
            print models_mod_name
            mod = __import__(models_mod_name, {}, {}, ['*'])
        except ImportError, e:
            pass
        else:
            print mod.__dict__.items()
            classes = list( module_explore(mod, filter_field) )
            print classes
            
    
    return
    
    
    mod = __import__('django.db.models', {}, {}, ['*'])
    classes = [ (name, class_) for name, class_ in mod.__dict__.items() 
                    if filter_field(class_)
              ]
    model_class_fields = SortedDict() 
    for name, class_ in classes:
        model_class_fields[name] = FieldIntrospection(class_)
    return model_class_fields