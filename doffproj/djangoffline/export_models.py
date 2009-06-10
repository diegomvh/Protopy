

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
        for f in self._arg_spec:
            pass

def get_model_class_fields():
    '''
    Loads Django ORM's fields
    '''
    #global model_class_fields
    from django.db.models import Field
    filter_field = lambda c: isclass(c) and issubclass(c, Field)
    mod = __import__('django.db.models.fields', {}, {}, ['*'])
    classes = [ (name, class_) for name, class_ in mod.__dict__.items() 
                    if filter_field(class_)
              ]
    model_class_fields = SortedDict() 
    for name, class_ in classes:
        model_class_fields[name] = FieldIntrospection(class_)
    return model_class_fields

# Cache
model_class_fields = get_model_class_fields()

def export_model_class(_class):
    fields = _class._meta.fields + _class._meta.many_to_many
    
    
    return fields

def export_models(models):
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
