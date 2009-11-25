require('doff.db.base', 'connection');
var models = require('doff.db.models.base');
require('doff.conf.settings', 'settings');

function syncdb(callback) {
	callback('syncdb', {'message': 'Create data base ' + settings.DATABASE_NAME, 'name': settings.DATABASE_NAME});
    var cursor = connection.cursor();
    
    // Get a list of already installed *models* so that references work right.
    var tables = connection.introspection.table_names();
    var seen_models = connection.introspection.installed_models(tables);
    var created_models = new Set();
    var pending_references = new Dict();

    // Create the tables for each model
    for each (var app in models.get_apps()) {
        var app_name = app.__name__.split('.').slice(-2)[0];
        var model_list = models.get_models(app);
        for each (var model in model_list) {
            // Create the model's database table, if it doesn't already exist.
            if (include(tables, connection.introspection.table_name_converter(model._meta.db_table)))
                continue;
            var [sql, references] = connection.creation.sql_create_model(model, seen_models);
            seen_models.add(model);
            created_models.add(model);
            for each (var [refto, refs] in references) {
                var result = pending_references.setdefault(refto, []);
                pending_references.set(refto, result.concat(refs));
                if (include(seen_models, refto))
                    sql = sql.concat(connection.creation.sql_for_pending_references(refto, pending_references));
            }
            callback('Create Table', {'model': model, 'app_name': app_name, 'sql': sql});
            sql = sql.concat(connection.creation.sql_for_pending_references(model, pending_references));
            for each (var statement in sql) {
                try {
                    cursor.execute(statement);
                } catch (e) { 
                	callback('Data Base Error', {'model': model, 'app_name': app_name, 'sql': sql, 'error': e });
                }
            }
            tables.push(connection.introspection.table_name_converter(model._meta.db_table));
        }
    }

    // Create the m2m tables. This must be done after all tables have been created
    // to ensure that all referred tables will exist.
    for each (var app in models.get_apps()) {
        var app_name = app.__name__.split('.').slice(-2)[0];
        var model_list = models.get_models(app);
        for each (var model in model_list) {
            if (include(created_models, model)) {
                var sql = connection.creation.sql_for_many_to_many(model);
                if (bool(sql)) {
                	callback('Create M2M Table', {'model': model, 'app_name': app_name, 'sql': sql});
                    for each (var statement in sql)
	                    try {
	                    	cursor.execute(statement);
	                    } catch (e) { 
	                    	callback('Data Base Error', {'model': model, 'app_name': app_name, 'sql': sql, 'error': e });
	                    }
                }
            }
        }
    }

    // The connection may have been closed by a syncdb handler.
    cursor = connection.cursor();

    // Install custom SQL for the app (but only if this
    // is a model we've just created)
    for each (var app in models.get_apps()) {
        var app_name = app.__name__.split('.').slice(-2)[0];
        for each (var model in models.get_models(app)) {
            if (include(created_models, model)) {
                var custom_sql = null //custom_sql_for_model(model);
                if (bool(custom_sql)) {
                	callback('Custom SQL', {'model': model, 'app_name': app_name, 'custom_sql': custom_sql});
                    try {
                        for each (var sql in custom_sql)
                            cursor.execute(sql);
                    } catch (e) {
                    	callback('Custom SQL Error', {'model': model, 'app_name': app_name, 'custom_sql': custom_sql, 'error': e });
                    }
                }
            }
        }
    }
    
    // Install SQL indicies for all newly created models
    for each (var app in models.get_apps()) {
        var app_name = app.__name__.split('.').slice(-2)[0];
        for each (var model in models.get_models(app)) {
            if (include(created_models, model)) {
                var index_sql = connection.creation.sql_indexes_for_model(model);
                if (bool(index_sql)) {
                	callback('Create Index', {'model': model, 'app_name': app_name, 'index_sql': index_sql});
                    try {
                        for each (var sql in index_sql)
                            cursor.execute(sql);
                    } catch (e) {
                    	callback('Index Error', {'model': model, 'app_name': app_name, 'index_sql': index_sql, 'error': e });
                    }
                }
            }
        }
    }
}

function removedb(callback) {
	callback('Destroy Data Base', {'name': settings.DATABASE_NAME});
    require('doff.db.base', 'connection');
    connection.open();
    connection.remove();
}

publish({ 
    syncdb: syncdb,
    removedb: removedb
});