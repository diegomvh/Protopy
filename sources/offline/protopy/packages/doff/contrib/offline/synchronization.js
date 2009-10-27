require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.models', 'SyncLog');
require('doff.db.models.base', 'get_model_by_identifier');
require('doff.db.models.query', 'delete_objects', 'CollectedObjects');

function from_server() {
    // Creo el objeto rpc para interactuar con el site
    var rpc = new ServiceProxy(get_project().offline_support + '/rpc', {asynchronous: false});
    // Obtengo el ultimo sync_log o null
    var last_sync_log = null;
    try {
        last_sync_log = SyncLog.objects.latest();
    } catch (e if isinstance(e, SyncLog.DoesNotExist)) {}
    //var last_sync_log = null;
    
    // Inicio la sincronizacion informando al site las intenciones
    var new_sync_data = rpc.begin_synchronization(last_sync_log);

    var models = [ get_model_by_identifier(i) for each (i in new_sync_data.models)];
    if (bool(models)) {
        // Si tengo cosas nuevas
        // Creo la nueva instancia de sync_log
        var new_sync_log = new SyncLog(new_sync_data);
        new_sync_log.save();
        var all_objects = [];
        for each (var model in models) {
            // Black Magic
            model.remotes = new_sync_log;
            for each (var obj in model.remotes.all())
                obj.save();
            model.remotes = null;
        }
        // Ahora que esta todo guardado limpio los inactivos que no tengan relacion con nada
        for each (var model in models.reverse()) {
            inactivos = model.objects.filter({'active': false});
            for (var obj in inactivos) {
                debugger;
                var seen_objs = new CollectedObjects();
                obj._collect_sub_objects(seen_objs);
                var items = seen_objs.items()
                if (len(items) == 1 && items[0][0] == models && len(items[0][1]) == 1)
                    obj.delete();
            }
        }
    }

    //rpc.end_synchronization(new_sync_log);
}

publish({
    from_server: from_server
});