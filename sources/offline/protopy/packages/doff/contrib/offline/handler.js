require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.models', 'SyncLog', 'RemoteModel', 'RemoteReadOnlyModel');
require('doff.db.models.base', 'get_model_by_identifier', 'get_models', 'ForeignKey');
require('doff.db.models.query', 'delete_objects', 'CollectedObjects');
require('doff.contrib.offline.serializers', 'RemoteDeserializer');
require('doff.utils.datastructures', 'SortedDict');
require('doff.contrib.offline.serializers', 'RemoteSerializer');

function get_model_order(model_lists) {
    var model_adj = new SortedDict();
    for each (var model in model_lists)
        model_adj.set(model, get_related_models(model));

    var order = model_adj.keys().filter(function(m) { return ! bool(model_adj.has_key(m)); });
    order.map(function(m) { return model_adj.pop(m); });
    while (bool(model_adj)) {
        for (var pair in model_adj) {
            var deps = model_adj.get(pair.key);

            if (deps.map(function (d) {return !include(model_adj, d); }).every(function (e) { return bool(e);})) {
                order.push(pair.key);
                model_adj.pop(pair.key);
            }
        }
    }
    return order;
}

function get_related_models(model) {
    var fks = model._meta.fields.filter(function (f) { return isinstance(f, ForeignKey); });
    fks = fks.map(function (relation) { return relation.rel.to; });

    return fks.concat(model._meta.many_to_many.map( function (relation) { return relation.rel.to; }));
}

var SyncHandler = type('SyncHandler', [ object ], {
    response_fixes: [],
    __init__: function(settings) {
        this.settings = settings;
        this.server = new ServiceProxy(get_project().offline_support + '/sync', {asynchronous: false});
        this.serializer = new RemoteSerializer();
        this.deserializer = RemoteDeserializer
        this.last_sync_log = null;
        this.new_sync_log = null;
        // MUEJEJEJEJ HOOKS
        // this.load_middleware();
        // Crear el resolver
    },

    update: function() {
        try {
            this.last_sync_log = SyncLog.objects.latest();
        } catch (e if isinstance(e, SyncLog.DoesNotExist)) {
            print('Es el primero, solo hago pull y retorno');
            var [ received, new_sync_log ] = this.pull();

            this.new_sync_log = new SyncLog(new_sync_log);
            this.new_sync_log.save();

            for (var obj in this.deserializer(received, this.new_sync_log))
            	// TODO: Implementar los middlewares de sync
            	//try {
            		obj.save();
            	//} catch ( e if isinstace(e, )) {
            		//this.conflict_middleware.
            	//}
            return;
        }
        
        var [ received, new_sync_log ] = this.pull();
        this.new_sync_log = new SyncLog(new_sync_log);
        this.new_sync_log.save();

        for (var obj in this.deserializer(received, this.new_sync_log))
            obj.save();
        
        var [ confirmed, new_sync_log ] = this.push();
        this.purge();
    },

    load_middleware: function() {
        /*
        Populate middleware lists from settings.MIDDLEWARE_CLASSES.
        */
        require('doff.core.exceptions');
        this._view_middleware = [];
        this._response_middleware = [];
        this._exception_middleware = [];

        var request_middleware = [];
        for each (var middleware_path in this.settings.SYNC_MIDDLEWARE_CLASSES) {
            var dot = middleware_path.lastIndexOf('.');
            if (dot == -1)
                throw new exceptions.ImproperlyConfigured('%s isn\'t a middleware module'.subs(middleware_path));
            var [ mw_module, mw_classname ] = [ middleware_path.slice(0, dot), middleware_path.slice(dot + 1)];
            try {
                var mod = require(mw_module);
            } catch (e if isinstance(e, LoadError)) {
                throw new exceptions.ImproperlyConfigured('Error importing middleware %s: "%s"'.subs(mw_module, e));
            }
            var mw_class = getattr(mod, mw_classname);
            if (isundefined(mw_class))
                throw new exceptions.ImproperlyConfigured('Middleware module "%s" does not define a "%s" class'.subs(mw_module, mw_classname));

            try {
                var mw_instance = new mw_class();
            } catch (e if isinstance(e, exceptions.MiddlewareNotUsed)) {
                continue;
            }

            if (hasattr(mw_instance, 'process_request'))
                request_middleware.push(mw_instance.process_request);
            if (hasattr(mw_instance, 'process_view'))
                this._view_middleware.push(mw_instance.process_view);
            if (hasattr(mw_instance, 'process_response'))
                this._response_middleware.shift(mw_instance.process_response);
            if (hasattr(mw_instance, 'process_exception'))
                this._exception_middleware.shift(mw_instance.process_exception);
        }
        // We only assign to this when initialization is complete as it is used
        // as a flag for initialization being complete.
        this._request_middleware = request_middleware;
    },

    purge: function(models) {
        //Elimina objetos que estan inactivos y no estan referenciados
        //Pre-condicion :P los modelos deben estar en orden que permita eliminar sin bloqueos
        for each (var model in models) {
            if (issubclass(model, RemoteModel)) {
                inactivos = model.objects.filter({ 'active': false });
                for (var obj in inactivos) {
                    var seen_objs = new CollectedObjects();
                    obj._collect_sub_objects(seen_objs);
                    var items = seen_objs.items()
                    if (len(items) == 1 && items[0][0] == model && len(items[0][1]) == 1)
                        obj.delete();
                }
            }
        }
    },

    pull: function() {
        //TODO: Transacciones en la base de datos
        if (this.last_sync_log != null) {
            var to_send = this.serializer.serialize(this.last_sync_log);
            var data = this.server.pull(to_send);
        } else {
            var data = this.server.pull();
        }
        
        return [ data['objects'], data['sync_log']];
    },

    push: function() {
        assert(this.last_sync_log != null, 'Sync log is required');
    	
    	var to_send = {};
    	to_send['sync_log'] = this.serializer.serialize(this.last_sync_log);
    	
        // Los borrados
        var models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.deleted.count() > 0; });

        models = get_model_order(models).reverse();
        to_send['deleted'] = {'models': models.map(function(m) { return string(m._meta); }), 'objects': {}};
        for each (var model in models) {
            var objs = model.deleted.all();
            var values = this.serializer.serialize(objs);
            to_send['deleted']['objects'][string(model._meta)] = values;
        }

        // Los creados
        models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.created.count() > 0; });
        // Los ordenamos
        models = get_model_order(models);
        to_send['created'] = {'models': models.map(function(m) { return string(m._meta); }), 'objects': {}};
        for each (var model in models) {
            var objs = model.created.all();
            var values = this.serializer.serialize(objs);
            to_send['created']['objects'][string(model._meta)] = values;
        }

        // Los modificados
        models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.modified.count() > 0; });
        to_send['modified'] = {'models': models.map(function(m) { return string(m._meta); }), 'objects': {}};
        for each (var model in models) {
            var objs = model.modified.all();
            var values = this.serializer.serialize(objs);
            to_send['modified']['objects'][string(model._meta)] = values;
        }
        
        var data = this.server.push(to_send);
        return data['objects'];
    }
});

/*
 * para deleted
 * 
 *  var keys = model.remotes.delete(values);
    for each (var obj in objs ) {
        obj.status = 's';
        obj.active = false;
        obj.save();
    }
    
    para created
    
    var keys = model.remotes.insert(values);
    for (i = 0; i < len(keys); i++ ) {
        objs[i].server_pk = keys[i];
        objs[i].status = 's';
        objs[i].save();
    }

    para modified
    var keys = model.remotes.update(values);
    for each (var obj in objs ) {
        obj.status = 's';
    }
 */


publish({
    SyncHandler: SyncHandler
});