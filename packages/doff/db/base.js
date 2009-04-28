require('doff.core.project', 'get_settings');
require('event');

var settings = get_settings();

var _load_path = 'doff.db.backends.';
var backend = require('%s%s.base'.subs(_load_path, settings.DATABASE_ENGINE));

var connection = new backend.DatabaseWrapper(settings);
var DatabaseError = new backend.DatabaseError();
var IntegrityError = new backend.IntegrityError();

function close_connection(kwargs){
    connection.close();
}

var hrf = event.subscribe('request_finished', close_connection);

function reset_queries(kwargs) {
    connection.queries = [];
}

var hrs = event.subscribe('request_started', reset_queries);

publish({
    backend: backend,
    connection: connection,
    DatabaseError: DatabaseError,
    IntegrityError: IntegrityError 
});
