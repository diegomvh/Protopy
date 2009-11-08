require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.models', 'SyncLog', 'RemoteModel', 'RemoteReadOnlyModel');
require('doff.db.models.base', 'get_model_by_identifier', 'get_models', 'ForeignKey');
require('doff.db.models.query', 'delete_objects', 'CollectedObjects');
require('doff.contrib.offline.serializers', 'RemoteSerializer', 'RemoteDeserializer', 'ServerPkDoesNotExist');
require('doff.utils.datastructures', 'SortedDict');

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
    __init__: function(settings) {
        this.settings = settings;
        this.server = new ServiceProxy(get_project().offline_support + '/sync', {asynchronous: false});
        this.serializer = new RemoteSerializer();
        this.deserializer = RemoteDeserializer
        // this.load_middleware();
    },

    save_recived: function(received, sync_log) {
        for (var obj in this.deserializer(received)) {
            // TODO: Implementar los middlewares de sync
            //try {
                obj.sync_log = sync_log;
                obj.save();
            //} catch ( e if isinstace(e, )) {
                //this.conflict_middleware.
            //}
        }
    },

    save_collected: function(collected, sync_log) {
        for each (var obj in collected) {
            // TODO: Implementar los middlewares de sync
            //try {
                obj.sync_log = sync_log;
                obj.save_base();
            //} catch ( e if isinstace(e, )) {
                //this.conflict_middleware.
            //}
        }
    },

    save_chunkeds: function(created) {
        for each (var obj in created) {
            // TODO: Implementar los middlewares de sync
            //try {
                obj.save_base();
            //} catch ( e if isinstace(e, )) {
                //this.conflict_middleware.
            //}
        }
    },

    update: function() {
        var last_sync_log = null;
        try {
            last_sync_log = SyncLog.objects.latest('pk');
        } catch (e if isinstance(e, SyncLog.DoesNotExist)) {
            var [ received, sync_log_data ] = this.pull(last_sync_log);

            if (bool(received)) {
                var sync_log = new SyncLog(sync_log_data);
                sync_log.save();
                this.save_recived(received, sync_log);
            }
            return;
        }

        var go_ahead = true;
        while (go_ahead) {
            var [ need_pull, chunked, deleted, modified, created, sync_log_data ] = this.push();
            if (need_pull) {
                var [ received, sync_log_data ] = this.pull(last_sync_log);
                var sync_log = new SyncLog(sync_log_data);
                sync_log.save();
                this.save_recived(received, sync_log);
                go_ahead = need_pull;
                continue;
            }
            var collected = deleted.concat(created, modified);
            var sync_log = new SyncLog(sync_log_data);
            sync_log.save();
            this.save_collected(collected, sync_log);
            go_ahead = chunked;
        }

        //this.purge(deleted);
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

    purge: function(objs) {
        for each (var obj in objs) {
            var seen_objs = new CollectedObjects();
            obj._collect_sub_objects(seen_objs);
            var items = seen_objs.items()
            if (len(items) == 1 && len(items[0][1]) == 1)
                obj.delete();
        }
    },

    pull: function(last_sync_log) {
        //TODO: Transacciones en la base de datos
        if (last_sync_log != null) {
            var to_send = this.serializer.serialize(last_sync_log);
            var data = this.server.pull(to_send);
        } else {
            var data = this.server.pull();
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
                var last_sync_log = model.all.latest('sync_log_id').sync_log;
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
                var last_sync_log = model.all.latest('sync_log_id').sync_log;
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
                collected_objects['created'][model_name] = array(objs);
                to_send['created']['models'].push(model_name);
                if (!(model_name in to_send['sync_log'])) {
                    var last_sync_log = model.all.latest('sync_log_id').sync_log;
                    to_send['sync_log'][model_name] = this.serializer.serialize(last_sync_log);
                }
            } catch (e if isinstance(e, ServerPkDoesNotExist)) {
                chunked = true;
                break;
            }
        }
        
        try {
            var data = this.server.push(to_send);
        } catch (e) {
            // TODO: algunas exeptions;
            return [ true, true, [], [], [], {}];
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