/* "doff.core.management.commands.removedb" */

function execute() {
    require('doff.db.base', 'connection');
    var cursor = connection.cursor();
    if (callable(cursor.remove))
        cursor.remove();
}

publish({ 
    'execute': execute 
});