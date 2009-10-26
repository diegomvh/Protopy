from django.utils.datastructures import SortedDict
from django.db.models.fields import Field
from django.db.models.query import QuerySet
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from django.core.serializers.python import Serializer as PythonSerializer
from django.core.serializers import base
from django.utils.encoding import smart_unicode
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
    SYNC_STATUS = (("s", "Synced"), ("c", "Created"), ("m", "Modified"), ("d", "Deleted"), ("b", "Bogus"))
    def __init__(self):
        self._serializer = None
        self._deserializer = None
        self._manager = None

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
        #Busco si tiene sync_log osea estoy en una transacion
        params = self._extract_sync_log(params)
        
        if method in methods:
            ret = getattr(self, method)(*params)

            if isinstance(ret, QuerySet) and self._sync_log != None:
                ret = self._serializer.serialize(self._build_object(ret))
            elif isinstance(ret, QuerySet):
                ret = list(ret.values())
            return ret
        else:
            raise Exception('bad method')

    def _build_object(self, query_set):
        is_sync_data = issubclass(query_set.model, SyncData)
        for sd_instance in query_set:
            if is_sync_data and sd_instance.active:
                real_instance = sd_instance.content_object
                real_instance.active = sd_instance.active
            else:
                real_instance = sd_instance
                if not is_sync_data:
                    real_instance.active = True
            real_instance.status = 's'
            yield real_instance
        raise StopIteration()

    def _extract_sync_log(self, params):
        self._sync_log = None
        if params and params[-1].has_key('model') and params[-1]['model'] == 'offline.synclog': 
            obj = params.pop()
            # Todo tirar un erro si no esta
            s = Session.objects.get(pk=obj['sync_id'])
            self._sync_log = s.get_decoded()
        return params

    def _get_query_set(self):
        if self._sync_log != None:
            #Primero busco si tengo datos traceados
            model_type = ContentType.objects.get_for_model(self._manager.model)
            sync_data = SyncData.objects.filter(content_type__pk = model_type.id)
            # Si tengo una fecha base y me fijo si tengo en ese rango de fechas?
            if self._sync_log.get('last_sync', False):
                sync_data = sync_data.filter(update_at__range=(self._sync_log['last_sync'], self._sync_log['synced_at']))
            #Oks, si estoy aca y no tengo sync data es porque no hay nada nuevo o porque no tengo datos traqueados
            if (bool(sync_data)):
                return sync_data
        return self._manager

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
            "server_pk"    : smart_unicode(obj._get_pk_val(), strings_only=True),
            "active"       : smart_unicode(obj.active, strings_only=True),
            "status"       : smart_unicode(obj.status, strings_only=True)
        }

    def end_object(self, obj):
        self.objects.append({
            "model"         : smart_unicode(obj._meta),
            "fields"        : self._current
        })
        self._current = None

class RemoteManager(RemoteManagerBase):
    def __init__(self):
        self._serializer = RemoteSerializer()
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
        self._serializer = RemoteReadOnlySerializer()
        #self.deserializer = PythonDeserializer

    def all(self):
        return self._get_query_set().all()

    def filter(self, kwargs):
        kwargs = dict([(str(v[0]), str(v[1])) for v in kwargs.iteritems()])
        return self._get_query_set().filter(**kwargs)

    def count(self):
        return self._get_query_set().count()