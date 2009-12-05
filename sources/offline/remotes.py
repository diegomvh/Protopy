# -*- coding: utf-8 -*-

from django.utils.datastructures import SortedDict
from django.db.models.fields import Field
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from django.core.serializers.base import DeserializedObject
from django.core.serializers.python import Serializer as PythonSerializer, Deserializer as PythonDeserializer, _get_model
from django.utils.encoding import smart_unicode
from django.db import models
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
        self.serializer = None
        self.deserializer = None
        self.model_manager = None

    def contribute_to_class(self, remote, name = 'remotes'):
        self.remote = remote
        try:
            self.model_manager = getattr(remote._meta, 'manager')
        except AttributeError:
            self.model_manager = getattr(remote._meta.model, '_default_manager')

        rpc = SimpleJSONRPCDispatcher(allow_none=False, encoding=None)
        rpc.register_introspection_functions()
        rpc.register_instance(self)
        setattr(remote, '_default_manager', self)
        setattr(remote, name, rpc)

    def _methods(self):
        return map(lambda m: m[0:-7], filter(lambda m: not m.startswith('_') and m.endswith('_values'), dir(self)))

    def _listMethods(self):
        return self._methods() or []

    def _methodHelp(self, method):
        methods = self._methods() or []
        if method in methods:
            return getattr(self, method).__doc__
        return ""

    def _dispatch(self, method, params):
        methods = self._methods() or []
        if method in methods:
            method = "%s_values" % method
            ret = getattr(self, method)(*params)
            return ret
        else:
            raise Exception('bad method')

    def build_remote_object(self, query_set):
        is_sync_data = issubclass(query_set.model, SyncData)
        for sd_instance in query_set:
            if is_sync_data:
                if sd_instance.content_object:
                    real_instance = sd_instance.content_object
                    real_instance.active = sd_instance.active
                else:
                    real_instance = sd_instance
            else:
                real_instance = sd_instance
                real_instance.active = True
            yield real_instance

    def get_query_set(self):
        model_type = ContentType.objects.get_for_model(self.model_manager.model)
        sync_data = SyncData.objects.filter(content_type__pk = model_type.id)
        return sync_data

    def all(self):
        objs = self.model_manager.all()
        return self.serializer.serialize(self.build_remote_object(objs), fields = self.remote.base_fields.keys())

    def filter(self, *args, **kwargs):
        #TODO: en funcion del filtro ver si tengo o no que usar sync_data o el manager del modelo
        objs = self.get_query_set().filter(*args, **kwargs)
        return self.serializer.serialize(self.build_remote_object(objs), fields = self.remote.base_fields.keys())

    def delete(self, values):
        objs = self.deserializer(values)
        ret = []
        for o in objs:
            pk = o.object.pk
            o.object.delete()
            ret.append(pk)
        return ret

    def insert(self, values):
        objs = self.deserializer(values)
        ret = []
        for obj in objs:
            if hasattr(self.remote, 'save'):
                obj = self.remote.save(obj)
            else:
                obj.save()
            ret.append(getattr(obj.object, obj.object._meta.pk.attname))
        return ret

    def update(self, values):
        objs = self.deserializer(values)
        ret = []
        for o in objs:
            o.save()
            ret.append(getattr(o.object, o.object._meta.pk.attname))
        return ret

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
    
    def save(self, deserialized_object):
        '''
        Saves on object that comes from the client.
        Override this method to correct alterations you might
        have made to the model structure :)
        @param deserialized_object: A DeserializedObject instance 
        '''
        obj = deserialized_object.save()
        return obj.object

#===============================================================================
# Serializer and Deserializer for RemoteManager
#===============================================================================    
class RemoteSerializer(PythonSerializer):

    def start_object(self, obj):
        self._current = {}

    def end_object(self, obj):
        is_sync_data = isinstance(obj, SyncData)
        if is_sync_data:
            real_class = obj.content_type.model_class()
            self.objects.append({
            "model"         : smart_unicode(real_class._meta),
            "server_pk"     : smart_unicode(obj._meta.get_field('object_id').to_python(obj.object_id), strings_only=True),
            "active"        : smart_unicode(obj.active, strings_only=True),
            "fields"        : self._current
            })
        else:
            self.objects.append({
                "model"         : smart_unicode(obj._meta),
                "server_pk"     : smart_unicode(obj._get_pk_val(), strings_only=True),
                "active"        : smart_unicode(obj.active, strings_only=True),
                "fields"        : self._current
            })
        self._current = None

def RemoteDeserializer(object_or_list, **options):
    models.get_apps()
    if isinstance(object_or_list, dict):
        object_or_list = [ object_or_list ]
    for d in object_or_list:
        # Look up the model and starting build a dict of data for it.
        Model = _get_model(d["model"])
        data = {}
        if d.has_key("pk"):
            data[ Model._meta.pk.attname ] = Model._meta.pk.to_python(d["pk"])
        m2m_data = {}

        # Handle each field
        for (field_name, field_value) in d["fields"].iteritems():
            if isinstance(field_value, str):
                field_value = smart_unicode(field_value, strings_only=True)

            field = Model._meta.get_field(field_name)

            # Handle M2M relations
            if field.rel and isinstance(field.rel, models.ManyToManyRel):
                m2m_convert = field.rel.to._meta.pk.to_python
                m2m_data[field.name] = [m2m_convert(smart_unicode(pk)) for pk in field_value]

            # Handle FK fields
            elif field.rel and isinstance(field.rel, models.ManyToOneRel):
                if field_value is not None:
                    data[field.attname] = field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value)
                else:
                    data[field.attname] = None

            # Handle all other fields
            else:
                data[field.name] = field.to_python(field_value)

        yield DeserializedObject(Model(**data), m2m_data)

class RemoteManager(RemoteManagerBase):
    def __init__(self):
        super(RemoteManager, self).__init__()
        self.serializer = RemoteSerializer()
        self.deserializer = RemoteDeserializer

    def all_values(self):
        return list(self.model_manager.all().values())

    def filter_values(self, kwargs):
        return list(self.model_manager.filter(**kwargs).values())

    def count_values(self):
        return self.model_manager.count()

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
            "value"         : smart_unicode(unicode(obj), strings_only=True),
        }

    def end_object(self, obj):
        is_sync_data = isinstance(obj, SyncData)
        if is_sync_data:
            real_class = obj.content_type.model_class()
            self.objects.append({
            "model"         : smart_unicode(real_class._meta),
            "server_pk"     : smart_unicode(obj._meta.get_field('object_id').to_python(obj.object_id), strings_only=True),
            "active"        : smart_unicode(obj.active, strings_only=True),
            "fields"        : self._current
            })
        else:
            self.objects.append({
                "model"         : smart_unicode(obj._meta),
                "server_pk"     : smart_unicode(obj._get_pk_val(), strings_only=True),
                "active"        : smart_unicode(obj.active, strings_only=True),
                "fields"        : self._current
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
        super(RemoteReadOnlyManager, self).__init__()
        self.serializer = RemoteReadOnlySerializer()
        self.deserializer = PythonDeserializer

    def all_values(self):
        return list(self.model_manager.all().values())

    def filter_values(self, kwargs):
        return list(self.model_manager.filter(**kwargs).values())

    def count_values(self):
        return self.model_manager.count()