/* "doff.db.backends.base" */
/*
 * Represents a database connection.
 */
var BaseDatabaseWrapper = type('BaseDatabaseWrapper', [ object ], {

    ops: null,
    __init__: function(settings) {
        this.connection = null;
        this.queries = [];
        this.settings = settings;
    },
    _commit: function() {
        if (this.connection)
            return this.connection.commit();
    },
    _rollback: function() {
        if (this.connection)
            return this.connection.rollback();
    },

    open: function() {
        if (this.connection == null) {
            this._cursor(this.settings);
        }
    },

    close: function() {
        if (this.connection) {
            this.connection.close();
        }
    },

    remove: function(){
        this.close();
        this.connection.remove();
        this.connection = null;
    },

    cursor: function() {
        return this._cursor(this.settings);
    }
});

var BaseDatabaseFeatures = type('BaseDatabaseFeatures', [ object ], {
    needs_datetime_string_cast: true,
    uses_custom_query_class: false,
    empty_fetchmany_value: [],
    update_can_self_select: true,
    interprets_empty_strings_as_nulls: false,
    can_use_chunked_reads: true,
    uses_savepoints: false,
    related_fields_match_type: false,
    can_read_columns_name: false
});

/*
    * This class encapsulates all backend-specific differences, such as the way
    * a backend performs ordering or calculates the ID of a recently-inserted row.
    */
var BaseDatabaseOperations = type('BaseDatabaseOperations', [ object ], {

    autoinc_sql: function(table, column) { return null; },
    date_extract_sql: function(lookup_type, field_name) { throw new NotImplementedError(); },
    date_trunc_sql: function(lookup_type, field_name) { throw new NotImplementedError(); },
    datetime_cast_sql: function() { return "%s"; },
    deferrable_sql: function() { return ''; },
    drop_foreignkey_sql: function() { return "DROP CONSTRAINT"; },
    drop_sequence_sql: function(table) { return null; },
    field_cast_sql: function(db_type) { return '%s'; },
    fulltext_search_sql: function(field_name) { throw NotImplementedError('Full-text search is not implemented for this database backend'); },
    last_executed_query: function(cursor, sql, params) {
        if (isinstance(params, Array))
            var u_params = array([val for (val in params)]);
        else
            var u_params = new Dict([[k, v] for ([k, v] in params.items())]);
        return sql.subs(u_params);
    },
    last_insert_id: function(cursor, table_name, pk_name) { return cursor.lastrowid; },
    lookup_cast: function(lookup_type) { return "%s"; },
    max_name_length: function() { return null; },
    no_limit_value: function() { throw new NotImplementedError() },
    pk_default_value: function() { return 'DEFAULT'; },
    query_class: function(DefaultQueryClass) { return null; },
    quote_name: function(name) { throw new NotImplementedError(); },
    random_function_sql: function() { return 'RANDOM()'; },
    regex_lookup: function(lookup_type) { throw new NotImplementedError(); },
    savepoint_create_sql: function(sid) { throw new NotImplementedError(); },
    savepoint_commit_sql: function(sid) { throw new NotImplementedError(); },
    savepoint_rollback_sql: function(sid) { throw new NotImplementedError(); },
    sql_flush: function(style, tables, sequences) { throw new NotImplementedError(); },
    sequence_reset_sql: function(style, model_list) { return []; },
    start_transaction_sql: function() { return "BEGIN;"; },
    tablespace_sql: function(tablespace, inline) { return ''; },
    prep_for_like_query: function(x) { return x.replace("\\", "\\\\").replace("%", "\%").replace("_", "\_")},
    prep_for_iexact_query: function(x) { return x.replace("\\", "\\\\").replace("%", "\%").replace("_", "\_")},
    value_to_db_date: function(value) {
        if (!value)
            return null;
        return '%s-%s-%s'.subs(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    },
    value_to_db_datetime: function(value) {
        if (!value)
            return null;
        return string(value);
    },
    value_to_db_time: function(value) {
        if (!value)
            return null;
        return '%s:%s:%s.%s'.subs(value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds());
    },
    value_to_db_decimal: function(value, max_digits, decimal_places) {
        if (!value)
            return null;
        //TODO: pasar a decimal,
        return util.format_number(value, max_digits, decimal_places);
    },
    year_lookup_bounds: function(value) {
        var first = '%s-01-01 00:00:00'
        var second = '%s-12-31 23:59:59.999999'
        return [first.subs(value), second.subs(value)];
    },
    year_lookup_bounds_for_date_field: function(value) {
        return this.year_lookup_bounds(value);
    }
});

var BaseDatabaseValidation = type('BaseDatabaseValidation', [ object ], {
    validate_field: function(errors, opts, f) {}
});

    /*
    * This class encapsulates all backend-specific introspection utilities
    */
var BaseDatabaseIntrospection = type('BaseDatabaseIntrospection', object, {
    data_types_reverse: {},
    __init__: function(connection) {
        this.connection = connection;
    },

    /*
        * Apply a conversion to the name for the purposes of comparison.
        * The default table name converter is for case sensitive comparison.
        */
    table_name_converter: function(name) {
        return name;
    },

    /*
        * Returns a list of names of all tables that exist in the database.
        */
    table_names: function() {
        var cursor = this.connection.cursor();
        return this.get_table_list(cursor);
    },

        /*
        * Returns a list of all table names that have associated Django models and are in INSTALLED_APPS.
        * If only_existing is True, the resulting list will only include the tables
        * that actually exist in the database.
        */
    doff_table_names: function(only_existing) {
        var models = require('doff.db.models.base');
        var tables = new Set();
        for each (var app in models.get_apps()) {
            for each (var model in models.get_models(app)) {
                tables.add(model._meta.db_table);
                tables.update([f.m2m_db_table() for (f in model._meta.local_many_to_many)]);
            }
        }
        if (only_existing) {
            var tn = this.table_names();
            tables = [t for (t in tables) if (include(tn, t))];
        }
        return tables;
    },

    /*
        * Returns a set of all models represented by the provided list of table names.
        */
    installed_models: function(tables) {
        var models = require('doff.db.models.base');
        var all_models = [];
        for each (var app in models.get_apps()) {
            for each (var model in models.get_models(app)) {
                all_models.push(model);
            }
        }
        var tn = tables.map(this.table_name_converter);
        return new Set([m for each (m in all_models) if (include(tn, this.table_name_converter(m._meta.db_table)))]);
    },

    /*
        * Returns a list of information about all DB sequences for all models in all apps.
        */
    sequence_list: function() {
        var models = require('doff.db.models.base');
        var apps = models.get_apps();
        var sequence_list = [];

        for each (var app in apps) {
            for each (var model in models.get_models(app)) {
                for each (var f in model._meta.local_fields) {
                    if (f instanceof models.AutoField) {
                        sequence_list.push({'table': model._meta.db_table, 'column': f.column});
                        break;
                    }
                }
                for each (var f in model._meta.local_many_to_many) {
                    sequence_list.push({'table': f.m2m_db_table(), 'column': null});
                }
            }
        }
        return sequence_list;
    }

});

publish({
    BaseDatabaseWrapper: BaseDatabaseWrapper,
    BaseDatabaseFeatures: BaseDatabaseFeatures,
    BaseDatabaseOperations: BaseDatabaseOperations,
    BaseDatabaseValidation: BaseDatabaseValidation,
    BaseDatabaseIntrospection: BaseDatabaseIntrospection 
});