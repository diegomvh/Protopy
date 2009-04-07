$D("doff.core.management.commands.removedb");

function execute() {
    $L('doff.db', 'connection');
    var cursor = connection.cursor();
    if (callable(cursor.remove))
        cursor.remove();
}

$P({ 
    'execute': execute 
});