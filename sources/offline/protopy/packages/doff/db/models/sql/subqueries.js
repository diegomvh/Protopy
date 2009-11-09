require('doff.db.models.sql.query', 'Query');
require('doff.db.models.sql.constants', 'GET_ITERATOR_CHUNK_SIZE');
require('doff.db.models.sql.expressions', 'SQLEvaluator');
require('doff.utils.datastructures', 'SortedDict');
require('doff.db.models.sql.where', 'AND', 'Constraint');
require('copy', 'copy');

/*
 * Delete queries are done through this class, since they are more constrained
 * than general queries.
 */
var DeleteQuery = type('DeleteQuery', [ Query ], {
    /*
     * Creates the SQL for this query. Returns the SQL string and list of
     * parameters.
     */
    as_sql: function(){
        assert (this.tables.length == 1, "Can only delete from one table at a time.");
        var result = ['DELETE FROM %s'.subs(this.quote_name_unless_alias(this.tables[0]))];
        var [where, params] = this.where.as_sql();
        result.push('WHERE %s'.subs(where));
        return [result.join(' '), array(params)];
    },

    do_query: function(table, where) {
        this.tables = [table];
        this.where = where;
        this.execute_sql(null);
    },

    /*
     * Set up and execute delete queries for all the objects related to the
     * primary key values in pk_list. To delete the objects themselves, use
     * the delete_batch() method.
     * More than one physical query may be executed if there are a
     * lot of values in pk_list.
     */
    delete_batch_related: function(pk_list) {
        var cls = this.model;
        for each (var related in cls._meta.get_all_related_many_to_many_objects()) {
            for each (var offset in range(0, len(pk_list), GET_ITERATOR_CHUNK_SIZE)) {
                var where = new this.where_class();
                where.add([new Constraint(null, related.field.m2m_reverse_name(), related.field), 'in', pk_list.slice(offset, offset + GET_ITERATOR_CHUNK_SIZE)], AND);
                this.do_query(related.field.m2m_db_table(), where);
            }
        }
        for each (var f in cls._meta.many_to_many) {
            var w1 = new this.where_class();
            for each (var offset in range(0, len(pk_list), GET_ITERATOR_CHUNK_SIZE)) {
                var where = new this.where_class();
                where.add([new Constraint(null, f.m2m_column_name(), f), 'in', pk_list.slice(offset, offset + GET_ITERATOR_CHUNK_SIZE)], AND);
                if (bool(w1))
                    where.add(w1, AND);
                this.do_query(f.m2m_db_table(), where);
            }
        }
    },

    /*
     * Set up and execute delete queries for all the objects in pk_list. This
     * should be called after delete_batch_related(), if necessary.
     * More than one physical query may be executed if there are a
     * lot of values in pk_list.
     */
    delete_batch: function(pk_list) {
        for each (var offset in range(0, len(pk_list), GET_ITERATOR_CHUNK_SIZE)) {
            var where = new this.where_class();
            var field = this.model._meta.pk;
            where.add([new Constraint(null, field.column, field), 'in', pk_list.slice(offset, offset + GET_ITERATOR_CHUNK_SIZE)], AND);
            this.do_query(this.model._meta.db_table, where);
        }
    }
});

/*
 * Represents an "update" SQL query.
 */
var UpdateQuery = type('UpdateQuery', [ Query ], {
    __init__: function(model, connection) {
        super(Query, this).__init__(model, connection);
        this._setup_query();
    },

    /*
     * Runs on initialization and after cloning. Any attributes that would
     * normally be set in __init__ should go in here, instead, so that they
     * are also set up after a clone() call.
     */
    _setup_query: function() {
        this.values = [];
        this.related_ids = null;
        if (!this['related_updates']);
            this.related_updates = new Dict();
    },

    clone: function(klass) {
        var arg = new Arguments(arguments);
        arg.kwargs['related_updates'] = copy(this.related_updates);
        return super(Query, this).clone(klass, arguments);
    },

    /*
        * Execute the specified update. Returns the number of rows affected by
        the primary update query (there could be other updates on related
        tables, but their rowcounts are not returned).
        */
    execute_sql: function(result_type) {
        var cursor = super(Query, this).execute_sql(result_type);
        var rows = cursor ? cursor.rowcount : 0;
        var is_empty = cursor == null;
        delete cursor;
        for each (var query in this.get_related_updates()) {
            var aux_rows = query.execute_sql(result_type);
            if (is_empty) {
                rows = aux_rows;
                is_empty = false;
            }
        }
        return rows;
    },

    /*
     * Creates the SQL for this query. Returns the SQL string and list of
     * parameters.
     */
    as_sql: function() {
        this.pre_sql_setup()
        if (!bool(this.values))
            return ['', []];
        var table = this.tables[0];
        var qn = getattr(this, 'quote_name_unless_alias');
        var result = ['UPDATE %s'.subs(qn(table))];
        result.push('SET');
        var values = [], update_params = [];
        for each (var element in this.values) {
            var [name, val, placeholder] = element;
            if (callable(val, 'as_sql')) {
                var [sql, params] = val.as_sql(qn);
                values.push('%s = %s'.subs(qn(name), sql));
                update_params = update_params.concat(params);
            } else if (val != null) {
                values.push('%s = %s'.subs(qn(name), placeholder));
                update_params.push(val);
            } else {
                values.push('%s = NULL'.subs(qn(name)));
            }
        }
        result.push(values.join(', '));
        var [where, params] = this.where.as_sql();
        if (bool(where))
            result.push('WHERE %s'.subs(where));
        return [result.join(' '), array(update_params.concat(params))];
    },

    /*
        * If the update depends on results from other tables, we need to do some
        munging of the "where" conditions to match the format required for
        (portable) SQL updates. That is done here.

        Further, if we are going to be running multiple updates, we pull out
        the id values to update at this point so that they don't change as a
        result of the progressive updates.
        */
    pre_sql_setup: function() {
        this.select_related = false;
        this.clear_ordering(true);
        super(Query, this).pre_sql_setup();
        var count = this.count_active_tables();
        if (!bool(this.related_updates) && count == 1)
            return;

        // We need to use a sub-select in the where clause to filter on things
        // from other tables.
        var query = this.clone(Query);
        query.bump_prefix();
        query.extra = new SortedDict();
        query.select = [];
        query.add_fields([query.model._meta.pk.name]);
        var must_pre_select = count > 1 && !this.connection.features.update_can_self_select;

        // Now we adjust the current query: reset the where clause and get rid
        // of all the tables we don't need (since they're in the sub-select).
        this.where = new this.where_class();
        if (bool(this.related_updates) || must_pre_select) {
            // Either we're using the idents in multiple update queries (so
            // don't want them to change), or the db backend doesn't support
            // selecting from the updating table (e.g. MySQL).
            var idents = [];
            for each (var rows in query.execute_sql(MULTI))
                idents = idents.concat([r[0] for (r in rows)]);
            this.add_filter(['pk__in', idents]);
            this.related_ids = idents;
        } else {
            // The fast path. Filters and updates in one query.
            this.add_filter(['pk__in', query]);
        }
        for each (var alias in this.tables.slice(1))
            this.alias_refcount[alias] = 0;
    },

    /*
     * Set up and execute an update query that clears related entries for the keys in pk_list.
     * This is used by the QuerySet.delete_objects() method.
     */
    clear_related: function(related_field, pk_list) {
        for each (var offset in range(0, pk_list.length, GET_ITERATOR_CHUNK_SIZE)) {
            this.where = new this.where_class();
            var f = this.model._meta.pk;
            this.where.add([new Constraint(null, f.column, f), 'in', pk_list.slice(offset, offset + GET_ITERATOR_CHUNK_SIZE)], AND);
            this.values = [[related_field.column, null, '%s']];
            this.execute_sql(null);
        }
    },

    /*
     * Convert a dictionary of field name to value mappings into an update
     * query. This is the entry point for the public update() method on querysets.
     */
    add_update_values: function(values) {
        var values_seq = [];
        for (var [name, val] in values) {
            var [field, model, direct, m2m] = this.model._meta.get_field_by_name(name);
            if (!direct || m2m)
                throw new FieldError('Cannot update model field %r (only non-relations and foreign keys permitted).'.subs(field));
            values_seq.push([field, model, val]);
        }
        return this.add_update_fields(values_seq);
    },

    /*
        * Turn a sequence of (field, model, value) triples into an update query.
        Used by add_update_values() as well as the "fast" update path when
        saving models.
        */
    add_update_fields: function(values_seq) {
        for each (var element in values_seq) {
            var [field, model, val] = element;
            if (hasattr(val, 'prepare_database_save'))
                val = val.prepare_database_save(field);
            else
                val = field.get_db_prep_save(val);

            // Getting the placeholder for the field.
            if (hasattr(field, 'get_placeholder'))
                var placeholder = field.get_placeholder(val);
            else
                var placeholder = '%s';

            if (hasattr(val, 'evaluate'))
                val = new SQLEvaluator(val, this, false);
            if (model)
                this.add_related_update(model, field.column, val, placeholder)
            else
                this.values.push([ field.column, val, placeholder ]);
        }
    },

    /*
        * Adds (name, value) to an update query for an ancestor model.
        * Updates are coalesced so that we only run one update query per ancestor.
        */
    add_related_update: function(model, column, value, placeholder) {
        if (!this.related_updates.has_key(model))
            this.related_updates.set(model, [[column, value, placeholder]]);
        else
            this.related_updates.get(model).push([column, value, placeholder]);
    },

    /*
        * Returns a list of query objects: one for each update required to an
        ancestor model. Each query will have the same filtering conditions as
        the current query but will only update a single table.
        */
    get_related_updates: function() {
        if (!bool(this.related_updates))
            return [];
        var result = [];
        for (var [model, values] in this.related_updates) {
            var query = new UpdateQuery(model, this.connection);
            query.values = values;
            if (this.related_ids)
                query.add_filter(['pk__in', this.related_ids])
            result.push(query);
        }
        return result;
    }
});

var InsertQuery = type('InsertQuery', [ Query ], {
    __init__: function(model, connection){
        super(Query, this).__init__(model, connection);
        this.columns = [];
        this.values = [];
        this.params = [];
        this.return_id = false;
    },

    clone: function(klass) {
        var arg = new Arguments(arguments, {'columns': copy(this.columns), 'values': copy(this.values), 'params': this.params});
        return super(Query, this)(klass, arg);
    },

    as_sql: function() {
        // We don't need quote_name_unless_alias() here, since these are all
        // going to be column names (so we can avoid the extra overhead).
        var qn = this.connection.ops.quote_name;
        var opts = this.model._meta;
        var result = ['INSERT INTO %s'.subs(qn(opts.db_table))];
        result.push('(%s)'.subs([qn(c) for each (c in this.columns)].join(', ')));
        result.push('VALUES (%s)'.subs(this.values.join(', ')));
        var params = this.params;
        if (this.return_id && this.connection.features.can_return_id_from_insert) {
            col = "%s.%s".subs(qn(opts.db_table), qn(opts.pk.column));
            var [ r_fmt, r_params ] = this.connection.ops.return_insert_id()
            result.append(r_fmt.subs(col));
            params = params.concat(r_params);
        }

        return [result.join(' '), this.params];
    },

    execute_sql: function(return_id) {
        return_id = isundefined(return_id) ? false : return_id;
        var cursor = super(Query, this).execute_sql(null);

        if (!(return_id && cursor))
            return;        
        if (this.connection.features.can_return_id_from_insert)
            return this.connection.ops.fetch_returned_insert_id(cursor);
        return this.connection.ops.last_insert_id(cursor, this.model._meta.db_table, this.model._meta.pk.column);
    },

    /*
        * Set up the insert query from the 'insert_values' dictionary. The
        dictionary gives the model field names and their target values.

        If 'raw_values' is True, the values in the 'insert_values' dictionary
        are inserted directly into the query, rather than passed as SQL
        parameters. This provides a way to insert NULL and DEFAULT keywords
        into the query, for example.
        */
    insert_values: function(insert_values, raw_values) {
        var placeholders = []; 
        var values = [];
        for each (var [field, val] in insert_values) {
            if (callable(field['get_placeholder']))
                // Some fields (e.g. geo fields) need special munging before
                // they can be inserted.
                placeholders.push(field.get_placeholder(val));
            else
                placeholders.push('%s');
            this.columns.push(field.column);
            values.push(val);
        }
        if (raw_values) {
            this.values = this.values.concat(values);
        } else {
            this.params = this.params.concat(array(values));
            this.values = this.values.concat(placeholders);
        }
    }
});

//HASTA ACA ESTA.
/*
    * A DateQuery is a normal query, except that it specifically selects a single
    * date field. This requires some special handling when converting the results
    *  back to Python objects, so we put it in a separate class.
    */
var DateQuery = type('DateQuery', [ Query ], {
        /*
        * Returns an iterator over the results from executing this query.
        */
    results_iter: function() {
        var resolve_columns = bool(this['resolve_columns']);
        if (resolve_columns) {
            var DateTimeField = require('doff.db.models.fields.base', 'DateTimeField');
            var fields = [DateTimeField()];
        } else {
            var typecast_timestamp = require('doff.db.backends.util', 'typecast_timestamp');
            var needs_string_cast = this.connection.features.needs_datetime_string_cast;
        }

        var offset = this.extra_select.length;
        for each (var rows in this.execute_sql(MULTI)) {
            for each (var row in rows) {
                var date = row[offset];
                if (resolve_columns)
                    date = this.resolve_columns(row, fields)[offset];
                else if (needs_string_cast)
                    date = typecast_timestamp(str(date));
                yield date;
            }
        }
    },

    /*
        * Converts the query into a date extraction query.
        */
    add_date_select: function(field, lookup_type, order) {
        var order = order || 'ASC';
        var result = this.setup_joins([field.name], this.get_meta(), this.get_initial_alias(), false);
        var alias = result[3][result[3].length -1];
        var select = new Date([alias, field.column], lookup_type, this.connection.ops.date_trunc_sql);
        this.select = [select];
        this.select_fields = [null];
        this.select_related = false;
        this.extra_select = {};
        this.distinct = true;
        this.order_by = order == 'ASC' && [1] || [-1];
    }
});

var AggregateQuery = type('AggregateQuery' , [ Query ], {
    /*
    An AggregateQuery takes another query as a parameter to the FROM
    clause and only selects the elements in the provided list.
    */
    add_subquery: function(query) {
        [ this.subquery, this.sub_params ] = query.as_sql(undefined, true);
    },

    as_sql: function(quote_func) {
        /*
        Creates the SQL for this query. Returns the SQL string and list of
        parameters.
        */
        var sql = ('SELECT %s FROM (%s) subquery'.subs(
                [ aggregate.as_sql() for each (aggregate in this.aggregate_select.values()) ].join(', '),
                this.subquery) );
        var params = this.sub_params;
        return [ sql, params ];
    }
});

publish({
    DeleteQuery: DeleteQuery,
    InsertQuery: InsertQuery,
    DateQuery: DateQuery,
    UpdateQuery: UpdateQuery,
    AggregateQuery: AggregateQuery
});
