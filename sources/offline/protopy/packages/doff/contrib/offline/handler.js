require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.models', 'SyncLog', 'RemoteModel', 'RemoteReadOnlyModel');
require('doff.db.models.base', 'get_model_by_identifier', 'get_models', 'ForeignKey');
require('doff.db.models.query', 'delete_objects', 'CollectedObjects');
require('doff.contrib.offline.serializers', 'RemoteSerializer', 'RemoteDeserializer', 'ChunkedSerialization');
require('doff.utils.datastructures', 'SortedDict');
require('doff.core.exceptions', 'ImproperlyConfigured');
require('doff.conf.settings', 'settings');

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
    __init__: function() {
		var project = get_project();
        this.settings = settings;
        // Esto puede fallar por no estar conectado.
        this.proxy = new ServiceProxy(project.offline_support + '/sync', {asynchronous: false});
        this.serializer = new RemoteSerializer();
        this.deserializer = RemoteDeserializer
        this.load_middleware();
    },

    save_recived: function(received, sync_log) {
        for (var obj in this.deserializer(received)) {
            // TODO: Implementar los middlewares de sync
            try {
                obj.object.sync_log = sync_log;
                obj.save();
            } catch ( e ) {
            	debugger;
                //this.conflict_middleware.
            }
        }
    },

    save_collected: function(collected, sync_log) {
        for each (var obj in collected) {
            // TODO: Implementar los middlewares de sync
            //try {
                if (sync_log != null)
                    obj.sync_log = sync_log;
                obj.save_base();
            //} catch ( e if isinstace(e, )) {
                //this.conflict_middleware.
            //}
        }
    },

    update: function() {
        var first = SyncLog.objects.count() == 0;
        var [ received, sync_log_data ] = this.pull();
        if (bool(received)) {
            var sync_log = new SyncLog(sync_log_data);
            sync_log.save();
            this.save_recived(received, sync_log);
        }
        if (first) return;
        
        debugger;
        var go_ahead = true;
        var collected = [];
        while (go_ahead) {                      // Mientras que continuo
            var [ need_pull, chunked, deleted, modified, created, sync_log_data ] = this.push();
            if (need_pull) {                    // Tengo que traer datos del servidor 
                var [ received, sync_log_data ] = this.pull();
                /*if (!bool(received))
                    throw new Exception('Server says pull, and not pulled data'); */
                var sync_log = new SyncLog(sync_log_data);          // Creo el sync log para el pull
                sync_log.save();
                this.save_recived(received, sync_log);              // Guardo el pull con su sync log
                if (bool(collected)) {                              // Tenia datos recolectados de antes?
                    this.save_collected(collected, sync_log);       // Los guardo con el mismo sync log
                    collected = [];                                 // y limpio lo recolectado
                }
                go_ahead = need_pull;
                continue;
            }
            var collected = collected.concat(deleted, created, modified);   // Recolecto los datos del push
            if (bool(collected)) {                                          // Tengo datos
                if (!chunked) {                                             // Si no estan cortado
                    var sync_log = new SyncLog(sync_log_data);              // Preparo el sync log para guardar
                    sync_log.save();
                } else {
                    var sync_log = null;                                    // Estan cortado, no les pongo sync log hasta que no esten todos 
                }
                //TODO: Estoy haciendo que se llame a save al pedo sobre los objetos si son producto de un corte
                this.save_collected(collected, sync_log);
            }
            go_ahead = chunked;
        }

        //this.purge(deleted);
    },

    load_middleware: function() {
        /*
        Populate middleware lists from settings.MIDDLEWARE_CLASSES.
        */
        this._sync_middleware = null;

        var dot = this.settings.SYNC_MIDDLEWARE_CLASS.lastIndexOf('.');
        if (dot == -1)
            throw new ImproperlyConfigured('%s isn\'t a middleware module'.subs(middleware_path));
        var [ mw_module, mw_classname ] = [ this.settings.SYNC_MIDDLEWARE_CLASS.slice(0, dot), this.settings.SYNC_MIDDLEWARE_CLASS.slice(dot + 1)];
        try {
            var mod = require(mw_module);
        } catch (e if isinstance(e, LoadError)) {
            throw new ImproperlyConfigured('Error importing middleware %s: "%s"'.subs(mw_module, e));
        }
        var mw_class = getattr(mod, mw_classname);
        if (isundefined(mw_class))
            throw new ImproperlyConfigured('Middleware module "%s" does not define a "%s" class'.subs(mw_module, mw_classname));
        this._sync_middleware = new mw_class();
    },

    purge: function(objs) {
        for each (var obj in objs) {
            var seen_objs = new CollectedObjects();
            obj._collect_sub_objects(seen_objs);
            var items = seen_objs.items()
            if (len(items) == 1 && len(items[0][1]) == 1)
                obj.delete();
        }
    },

    pull: function() {
    	try {
            var last_sync_log = SyncLog.objects.latest('pk');
            var to_send = this.serializer.serialize(last_sync_log);
            var data = this.proxy.pull(to_send);
        } catch (e if isinstance(e, SyncLog.DoesNotExist)) {
            var data = this.proxy.pull();
        }

        return [ data['objects'], data['sync_log']];
    },

    push: function() {

        var chunked = false;
        var collected_objects = {};
        var to_send = {'sync_log': {}};

        // Los borrados
        var models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.deleted.count() > 0; });

        models = get_model_order(models).reverse();
        to_send['deleted'] = {'models': models.map(function(m) { return string(m._meta); }), 'objects': {}};
        collected_objects['deleted'] = {};
        for each (var model in models) {
            var objs = model.deleted.all();
            var model_name = string(model._meta);
            collected_objects['deleted'][model_name] = array(objs);
            to_send['deleted']['objects'][model_name] = this.serializer.serialize(objs);
            if (!(model_name in to_send['sync_log'])) {
                var last_sync_log = model.all.latest('sync_log__id').sync_log;
                to_send['sync_log'][model_name] = this.serializer.serialize(last_sync_log);
            }
        }

        // Los modificados
        models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.modified.count() > 0; });
        to_send['modified'] = {'models': models.map(function(m) { return string(m._meta); }), 'objects': {}};
        collected_objects['modified'] = {};
        for each (var model in models) {
            var objs = model.modified.all();
            var model_name = string(model._meta);
            collected_objects['modified'][model_name] = array(objs);
            to_send['modified']['objects'][model_name] = this.serializer.serialize(objs);
            if (!(model_name in to_send['sync_log'])) {
                var last_sync_log = model.all.latest('sync_log__id').sync_log;
                to_send['sync_log'][model_name] = this.serializer.serialize(last_sync_log);
            }
        }

        // Los creados
        models = get_models().filter(function(m) { return issubclass(m, RemoteModel) && ! issubclass(m, RemoteReadOnlyModel) && m.created.count() > 0; });
        // Los ordenamos
        models = get_model_order(models);
        to_send['created'] = {'models': [], 'objects': {}};
        collected_objects['created'] = {};
        for each (var model in models) {
            var objs = model.created.all();
            var model_name = string(model._meta);
            try {
                to_send['created']['objects'][model_name] = this.serializer.serialize(objs);
            } catch (e if isinstance(e, ChunkedSerialization)) {
            	chunked = true;
            	if (!bool(e.kwargs['values'])) 
            		continue;
            	to_send['created']['objects'][model_name] = e.kwargs['values'];
            	objs = new Set(array(objs)).difference(e.kwargs['chunkeds']);
            }
            collected_objects['created'][model_name] = array(objs);
            to_send['created']['models'].push(model_name);
            if (!(model_name in to_send['sync_log'])) {
                var last_sync_log = model.all.latest('sync_log__id').sync_log;
                to_send['sync_log'][model_name] = this.serializer.serialize(last_sync_log);
            }
        }
        
        try {
            var data = this.proxy.push(to_send);
        } catch (e) {
            // TODO: algunas exeptions;
            return [ true, chunked, [], [], [], {}];
        }

        // Tengo los datos del servidor

        // Los borrados
        var deleted = [];
        for each (var model in data['deleted']['models']) {
            var pks_len = len(data['deleted']['pks'][model]);
            var objs_len = len(collected_objects['deleted'][model]);
            if (pks_len != objs_len) {
                //Algo esta muy mal
                throw new Exception('Deleted data number');
            }
            for (i = 0; i < objs_len; i++) {
                collected_objects['deleted'][model][i].status = 's';
                collected_objects['deleted'][model][i].active = false;
            }
            deleted = deleted.concat(collected_objects['deleted'][model]);
        }

        // Los creados
        var created = [];
        for each (var model in data['created']['models']) {
            var pks_len = len(data['created']['pks'][model]);
            var objs_len = len(collected_objects['created'][model]);
            if (pks_len != objs_len) {
                //Algo esta muy mal
                throw new Exception('Created data number');
            }
            for (i = 0; i < objs_len; i++) {
                collected_objects['created'][model][i].status = 's';
                collected_objects['created'][model][i].server_pk = data['created']['pks'][model][i];
            }
            created = created.concat(collected_objects['created'][model]);
        }
        
        // Los modificados
        var modified = [];
        for each (var model in data['modified']['models']) {
            var pks_len = len(data['modified']['pks'][model]);
            var objs_len = len(collected_objects['modified'][model]);
            if (pks_len != objs_len) {
                //Algo esta muy mal
                throw new Exception('Modified data number');
            }
            for (i = 0; i < objs_len; i++) {
                collected_objects['modified'][model][i].status = 's';
            }
            modified = modified.concat(collected_objects['modified'][model]);
        }

        return [ false, chunked, deleted, modified, created, data['sync_log']];
    }
});

publish({
    SyncHandler: SyncHandler
});