$L('doff.conf', 'settings');
$L('doff.db.models.signals');

var _load_path = 'doff.db.backends.';
var backend = $L('%s%s.base'.subs(_load_path, settings.DATABASE_ENGINE));

var connection = new backend.DatabaseWrapper(settings);
var DatabaseError = new backend.DatabaseError();
var IntegrityError = new backend.IntegrityError();

function close_connection(kwargs){
    connection.close();
}

//signals.request_finished.connect(close_connection);

function reset_queries(kwargs) {
    connection.queries = [];
}

//signals.request_started.connect(reset_queries);

$P({    'backend': backend,
        'connection': connection,
        'DatabaseError': DatabaseError,
        'IntegrityError': IntegrityError });
