from django.utils.datastructures import SortedDict
from django.db.models.fields import Field
from django.db.models.query import QuerySet
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from django.core import serializers
from django.db import models

class RemoteOptions(object):
    def __init__(self, options=None):
        self.model = getattr(options, 'model', None)
        self.fields = getattr(options, 'fields', None)
        self.exclude = getattr(options, 'exclude', None)
    
class RemoteModelMetaclass(type):
    def __new__(cls, name, bases, attrs):
        '''
        Generate the class 
        '''
        try:
            parents = [b for b in bases if issubclass(b, RemoteModelProxy)]
        except NameError:
            # We are defining ModelForm itself.
            parents = None

        declared_fields = dict(filter(lambda tupla: isinstance(tupla[1], Field), attrs.iteritems()))
        new_class = super(RemoteModelMetaclass, cls).__new__(cls, name, bases, attrs)
        if not parents:
            return new_class
        opts = new_class._meta = RemoteOptions(getattr(new_class, 'Meta', None))

        fields = fields_for_model(opts.model, opts.fields, opts.exclude)
        fields.update(declared_fields)

        new_class.declared_fields = declared_fields
        new_class.base_fields = fields

        return new_class

class RemoteReadOnlyModelMetaclass(type):
    def __new__(cls, name, bases, attrs):
        try:
            parents = [b for b in bases if issubclass(b, RemoteReadOnlyModelProxy)]
        except NameError:
            # We are defining ModelForm itself.
            parents = None

        new_class = super(RemoteReadOnlyModelMetaclass, cls).__new__(cls, name, bases, attrs)
        if not parents:
            return new_class
        opts = new_class._meta = RemoteOptions(getattr(new_class, 'Meta', None))

        fields = { opts.model._meta.pk.name: opts.model._meta.pk }
        fields['value'] = models.CharField(max_length = 250)
        
        new_class.base_fields = fields

        return new_class

class RemoteModelProxy(object):
    __metaclass__ = RemoteModelMetaclass

class RemoteReadOnlyModelProxy(object):
    __metaclass__ = RemoteReadOnlyModelMetaclass
            
#===============================================================================
# Options
#===============================================================================
def fields_for_model(model, fields=None, exclude=None):
    field_list = []
    opts = model._meta
    for f in opts.fields + opts.many_to_many:
        if fields and not f.name in fields:
            continue
        if exclude and f.name in exclude:
            continue
        field_list.append((f.name, f))
    field_dict = SortedDict(field_list)
    if fields:
        field_dict = SortedDict([(f, field_dict.get(f)) for f in fields if (not exclude) or (exclude and f not in exclude)])
    return field_dict

class RemoteManagerBase(object):
    def __init__(self):
        self._format = 'python'

    def _contribute_to_class(self, remote, name):
        try:
            self._manager = getattr(remote._meta, 'manager')
        except AttributeError, e:
            self._manager = getattr(remote._meta.model, '_default_manager')

        rpc = SimpleJSONRPCDispatcher(allow_none=False, encoding=None)
        rpc.register_introspection_functions()
        rpc.register_instance(self)
        setattr(remote, name, rpc)
        
    def _methods(self):
        return filter(lambda m: not m.startswith('_'), dir(self))

    def _listMethods(self):
        return self._methods() or []

    def _methodHelp(self, method):
        methods = self._methods() or []
        if method in methods:
            return getattr(self, method).__doc__
        return ""

    def _dispatch(self, method, params):
        methods = self._methods() or []
        sync_log = None
        if method in methods:
            if params and params[-1].has_key('model') and params[-1]['model'] == 'offline.synclog': 
                sync_log = params.pop()
            ret = getattr(self, method)(*params)
            if isinstance(ret, QuerySet):
                ret = serializers.serialize(self._format, ret)
            return ret
        else:
            raise Exception('bad method')

class RemoteManager(RemoteManagerBase):

    def all(self):
        return self._manager.all()

    def filter(self, kwargs):
        kwargs = dict([(str(v[0]), str(v[1])) for v in kwargs.iteritems()])
        return self._manager.filter(**kwargs)

    def count(self):
        return self._manager.count()

class RemoteReadOnlyManager(RemoteManagerBase):

    def all(self):
        return self._manager.all()

    def filter(self, kwargs):
        kwargs = dict([(str(v[0]), str(v[1])) for v in kwargs.iteritems()])
        return self._manager.filter(**kwargs)

    def count(self):
        return self._manager.count()