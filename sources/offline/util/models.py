'''
Models
'''
from django.utils.datastructures import SortedDict
from copy import copy

#def itemodule(mod, skip_underunder = True):
#    '''
#    Enables module element iterations, yields name, value tuples
#    @param mod: Module to be explored
#    @param skip_underunder: Skip __ elements
#    '''
#    for k, v in mod.__dict__.iteritems():
#        if skip_underunder and k.startswith('__'):
#            continue
#        yield k, v
#        
#def module_models(mod):
#    from django.db.models import Model
#    return [ v for _k, v in itemodule(mod) if isclass(v) and issubclass(v, Model)]
    
class modeldict(SortedDict):
    def in_order_list(self):
        '''
        
        '''
        def explore(mapping, used):
            for model, deps in mapping.iteritems():
                if all(map(lambda e: e in used, deps)):
                    if not model in used:
                        used.append(model)
                        yield model
             
        used = []
        while used != self.keys():
            for m in explore(self, used):
                yield m
            

def model_tree(app_label_or_app):
    '''
    Get model order by their relations
    '''
    from django.db.models import Model
    from django.db.models.loading import get_app, get_models
    if isinstance(app_label_or_app, basestring):
        app = get_app(app_label_or_app)
    else:
        app = app_label_or_app
        assert isinstance(app, Model)
        
    models = get_models(app)
    tree = modeldict()
    for model in models:
        meta = model._meta
        #model_name = '.'.join( [ meta.app_label, meta.module_name ] )
        deps = []
        tree[model] = deps
        
        for rel_model in meta.many_to_many:
            deps.append(rel_model.rel.to)
        #import ipdb; ipdb.set_trace()
    return tree
    