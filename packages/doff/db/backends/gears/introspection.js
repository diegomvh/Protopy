$L('doff.db.backends', 'BaseDatabaseIntrospection');

// This light wrapper "fakes" a dictionary interface, because some SQLite data
// types include variables in them -- e.g. "varchar(30)" -- and can't be matched
// as a simple dictionary lookup.
var data_types_reverse = {
        'bool': 'BooleanField',
        'boolean': 'BooleanField',
        'smallint': 'SmallIntegerField',
        'smallint unsigned': 'PositiveSmallIntegerField',
        'smallinteger': 'SmallIntegerField',
        'int': 'IntegerField',
        'integer': 'IntegerField',
        'integer unsigned': 'PositiveIntegerField',
        'decimal': 'DecimalField',
        'real': 'FloatField',
        'text': 'TextField',
        'char': 'CharField',
        'date': 'DateField',
        'datetime': 'DateTimeField',
        'time': 'TimeField',
    };

var DatabaseIntrospection = type('DatabaseIntrospection', BaseDatabaseIntrospection, {

    /*
     * Returns a list of table names in the current database.
     */
    'get_table_list': function get_table_list(cursor) {
        // Skip the sqlite_sequence system table used for autoincrement key generation.
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND NOT name='sqlite_sequence' ORDER BY name");
        return [row['name'] for each (row in cursor.fetchall())];
    },

    /*
     * Returns a description of the table, with the DB-API cursor.description interface.
     */
    'get_table_description': function get_table_description(cursor, table_name) {
        return [[info['name'], info['type'], null, null, null, null, info['null_ok']] for each (info in this._table_info(cursor, table_name))];
    },

    'get_relations': function get_relations(cursor, table_name) {
        throw new NotImplementedError();
    },

    /*
     * Returns a dictionary of fieldname -> infodict for the given table,
        where each infodict is in the format:
            {'primary_key': boolean representing whether it's the primary key,
             'unique': boolean representing whether it's a unique index}
     */
    'get_indexes': function get_indexes(cursor, table_name) {
        var indexes = {};
        for each (var info in this._table_info(cursor, table_name))
            indexes[info['name']] = {'primary_key': info['pk'] != 0, 'unique': false};
        cursor.execute('PRAGMA index_list(%s)'.subs(this.connection.ops.quote_name(table_name)));
        // seq, name, unique
        for each (var [index, unique] in [(field[1], field[2]) for each (field in cursor.fetchall())]) {
            if (!unique)
                continue;
            cursor.execute('PRAGMA index_info(%s)'.subs(this.connection.ops.quote_name(index)));
            var info = cursor.fetchall();
            // Skip indexes across multiple fields
            if (info.length != 1)
                continue;
            var name = info[0][2] // seqno, cid, name
            indexes[name]['unique'] = true;
        }
        return indexes;
    },

    '_table_info': function _table_info(cursor, name) {
        cursor.execute('PRAGMA table_info(%s)'.subs(this.connection.ops.quote_name(name)));
        // cid, name, type, notnull, dflt_value, pk
        return [{'name': field[1], 'type': field[2], 'null_ok': !field[3], 'pk': field[5]} for each (field in cursor.fetchall())];
    }
});

publish({ 
    DatabaseIntrospection: DatabaseIntrospection 
});

    