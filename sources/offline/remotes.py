import md5
from django.utils.datastructures import SortedDict
from django.db.models.fields import Field
from django.db.models.query import QuerySet
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from django.core.serializers.python import Serializer as PythonSerializer
from django.core.serializers import base
from django.utils.encoding import smart_unicode, is_protected_type
from django.db import models
from django.contrib.sessions.models import Session
from django.contrib.contenttypes.models import ContentType
from offline.models import SyncData

#===============================================================================
# Varios
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

class RemoteOptions(object):
    def __init__(self, options=None):
        self.model = getattr(options, 'model', None)
        self.fields = getattr(options, 'fields', None)
        self.exclude = getattr(options, 'exclude', None)

class RemoteManagerBase(object):
    def __init__(self):
        self.serializer = None
        self.deserializer = None

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
        self._sync_log = None
        if method in methods:
            if params and params[-1].has_key('model') and params[-1]['model'] == 'offline.synclog': 
                self._set_sync_log(params.pop())
            ret = getattr(self, method)(*params)
            if isinstance(ret, QuerySet):
                ret = self.serializer.serialize(ret)
            return ret
        else:
            raise Exception('bad method')

    def _set_sync_log(self, obj):
        # Todo tirar un erro si no esta
        print(obj['sync_id'])
        s = Session.objects.get(pk=obj['sync_id'])
        self._sync_log = s.get_decoded()
    
    def _get_query_set(self):
        if self._sync_log != None:
            model_type = ContentType.objects.get_for_model(self._manager.model)
            if self._sync_log.get('last_sync', False):
                return SyncData.objects.filter(content_type__pk = model_type.id, update_at__range=(self._sync_log['last_sync'], self._sync_log['synced_at']))
            else:
                return SyncData.objects.filter(content_type__pk = model_type.id)
        else:
            self._manager

#===============================================================================
# RemoteModel
#===============================================================================    
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

class RemoteModelProxy(object):
    __metaclass__ = RemoteModelMetaclass

#TODO: MEjorar esto
class RemoteSerializer(PythonSerializer):
    
    def start_object(self, obj):
        self._current = {
            "server_pk"     : smart_unicode(obj.content_object._get_pk_val(), strings_only=True),
            "_active"       : smart_unicode(obj.active, strings_only=True),
            "_status"       : smart_unicode('s', strings_only=True)
        }

    def end_object(self, obj):
        self.objects.append({
            "model"  : smart_unicode(obj.content_object._meta),
            "fields" : self._current
        })
        self._current = None

    def handle_field(self, obj, field):
        super(PythonSerializer, self).handle_field(obj.content_object, field)
        
    def handle_fk_field(self, obj, field):
        related = getattr(obj, field.name)
        if related is not None:
            if field.rel.field_name == related._meta.pk.name:
                # Related to remote object via primary key
                related = related._get_pk_val()
            else:
                # Related to remote object via other field
                related = getattr(related, field.rel.field_name)
        self._current[field.name] = smart_unicode(related, strings_only=True)

    def handle_m2m_field(self, obj, field):

class RemoteManager(RemoteManagerBase):
    def __init__(self):
        self.serializer = RemoteSerializer()
        #self.deserializer = PythonDeserializer

    def all(self):
        return self._get_query_set().all()

    def filter(self, kwargs):
        kwargs = dict([(str(v[0]), str(v[1])) for v in kwargs.iteritems()])
        return self._get_query_set().filter(**kwargs)

    def count(self):
        return self._get_query_set().count()

#===============================================================================
# RemoteReadOnlyModel
#===============================================================================
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

class RemoteReadOnlyModelProxy(object):
    __metaclass__ = RemoteReadOnlyModelMetaclass

class RemoteReadOnlySerializer(PythonSerializer):
    
    def start_object(self, obj):
        self._current = {
            "server_pk"     : smart_unicode(obj._get_pk_val(), strings_only=True),
            "value"         : smart_unicode(unicode(obj), strings_only=True),
        }

    def end_object(self, obj):
        self.objects.append({
            "model"  : smart_unicode(obj._meta),
            "fields" : self._current
        })
        self._current = None

    def handle_field(self, obj, field):
        pass
        
    def handle_fk_field(self, obj, field):
        pass

    def handle_m2m_field(self, obj, field):
        pass

class RemoteReadOnlyManager(RemoteManagerBase):
    def __init__(self):
        self.serializer = RemoteReadOnlySerializer()
        #self.deserializer = PythonDeserializer

    def all(self):
        return self._get_query_set().all()

    def filter(self, kwargs):
        kwargs = dict([(str(v[0]), str(v[1])) for v in kwargs.iteritems()])
        return self._get_query_set().filter(**kwargs)

    def count(self):
        return self._get_query_set().count()