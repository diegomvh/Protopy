require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('doff.contrib.offline.models', 'SyncLog');
require('doff.db.models.base', 'get_model_by_identifier');

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
        //TODO: Ver que pasa si en lugar de hacer una mega bolsa de cosas para guardar voy comprometiendo los datos a medidad que los obtengo
        var all_objects = [];
        for each (var model in models) {
            // Black Magic
            model.remotes = new_sync_log;
            print(model, model.remotes.all());
        }
    }
}

publish({
    synchronize: synchronize
});