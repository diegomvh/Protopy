$D("doff.db.models.sql.query");
    
$L('doff.utils.tree', 'Node');
$L('doff.utils.datastructures', 'SortedDict');
$L('doff.db', 'connection');
$L('doff.db.models.signals');
$L('doff.db.models.fields', 'FieldDoesNotExist');
$L('doff.db.models.query_utils', 'select_related_descend');
$L('doff.db.models.sql.datastructures', 'Count', 'EmptyResultSet', 'Empty', 'MultiJoin');
$L('doff.db.models.sql.where', 'WhereNode', 'EverythingNode', 'AND', 'OR');
$L('doff.core.exceptions', 'FieldError');
$L('sets', 'Set');
$L('doff.db.models.sql.constants', '*');
$L('copy', 'copy', 'deepcopy');
                    
/*
 * A single SQL query
 */
var Query = Class('Query', {
    INNER: 'INNER JOIN',
    LOUTER: 'LEFT OUTER JOIN',
    alias_prefix: 'T',
    query_terms: QUERY_TERMS,
    
    __init__: function(model, connection, where){
        var where = where || WhereNode;
        this.model = model;
        this.connection = connection;

        this.alias_refcount = {};
        this.alias_map = {};    // Maps alias to join information
        this.table_map = {};    // Maps table names to list of aliases.
        this.join_map = {};
        this.rev_join_map = {}; // Reverse of join_map.
        this.quote_cache = {};
        this.default_cols = true;
        this.default_ordering = true;
        this.standard_ordering = true;
        this.ordering_aliases = [];
        this.select_fields = [];
        this.related_select_fields = [];
        this.dupe_avoidance = dict();
        this.used_aliases = new Set();
        this.filter_is_sticky = false;

        // SQL-related attributes
        this.select = [];
        this.tables = [];    // Aliases in the order they are created.
        this.where = new where();
        this.where_class = where;
        this.group_by = [];
        this.having = [];
        this.order_by = [];
        this.low_mark = 0;
        this.high_mark = null; // Used for offset/limit
        this.distinct = false;
        this.select_related = false;
        this.related_select_cols = [];

        // These are for extensions. The contents are more or less appended
        // verbatim to the appropriate clause.
        this.extra_select = new SortedDict();
        this.extra_tables = [];
        this.extra_where = [];
        this.extra_params = [];
        this.extra_order_by = [];

        // Arbitrary maximum limit for select_related. Prevents infinite
        // recursion. Can be changed by the depth parameter to select_related().
        this.max_depth = 5;
    },
    
    __str__: function(){
        var [sql, params] = this.as_sql();
        return sql.subs(params);
    },

    __deepcopy__: function(){
        return this.clone();
    },
    
    /*
     * Returns the Options instance (the model._meta) from which to start
     * processing. Normally, this is self.model._meta, but it can be changed
     * by subclasses.
     */
    get_meta: function() {
        return this.model._meta;
    },

    /*
        * A wrapper around connection.ops.quote_name that doesn't quote aliases
        * for table names. This avoids problems with some SQL dialects that treat
        * quoted strings specially (e.g. PostgreSQL).
        */
    quote_name_unless_alias: function(name) {
        if (name in this.quote_cache)
            return this.quote_cache[name];
        if ((name in this.alias_map && !(name in this.table_map)) || this.extra_select.has_key(name)) {
            this.quote_cache[name] = name;
            return name;
        }
        var r = this.connection.ops.quote_name(name);
        this.quote_cache[name] = r;
        return r;
    },

    /*
        * Creates a copy of the current instance. The 'kwargs' parameter can be
        * used by clients to update attributes after copying has taken place.
        */
    clone: function(klass) {

        var [args, kwargs] = Query.prototype.clone.extra_arguments(arguments);
        var obj = new Empty();
        klass = klass || this.constructor;
        obj.__proto__ = klass.prototype;
        obj.model = this.model;
        obj.connection = this.connection;
        obj.alias_refcount = copy(this.alias_refcount);
        obj.alias_map = copy(this.alias_map);
        obj.table_map = copy(this.table_map);
        obj.join_map = copy(this.join_map);
        obj.rev_join_map = copy(this.rev_join_map);
        obj.quote_cache = {};
        obj.default_cols = this.default_cols;
        obj.default_ordering = this.default_ordering;
        obj.standard_ordering = this.standard_ordering;
        obj.ordering_aliases = [];
        obj.select_fields = copy(this.select_fields);
        obj.related_select_fields = copy(this.related_select_fields);
        obj.dupe_avoidance = copy(this.dupe_avoidance);
        obj.select = copy(this.select);
        obj.tables = copy(this.tables);
        obj.where = deepcopy(this.where);
        obj.where_class = this.where_class
        obj.group_by = copy(this.group_by);
        obj.having = copy(this.having);
        obj.order_by = copy(this.order_by);
        obj.low_mark = this.low_mark;
        obj.high_mark = this.high_mark;
        obj.distinct = this.distinct;
        obj.select_related = this.select_related;
        obj.related_select_cols = [];
        obj.max_depth = this.max_depth;
        obj.extra_select = new SortedDict(this.extra_select);
        obj.extra_tables = this.extra_tables;
        obj.extra_where = this.extra_where;
        obj.extra_params = this.extra_params;
        obj.extra_order_by = this.extra_order_by;
        if (this.filter_is_sticky && this.used_aliases)
            obj.used_aliases = copy(this.used_aliases);
        else
            obj.used_aliases = new Set();
        obj.filter_is_sticky = false;
        extend(obj, kwargs);
        if (obj['_setup_query'])
            obj._setup_query();
        return obj;
    },

    /*
        * Returns an iterator over the results from executing this query.
        */
    results_iter: function() {
        for each (var rows in this.execute_sql(MULTI))
            for each (var row in rows)
                yield row;
    },
    
    /*
        * Performs a COUNT() query using the current filter constraints.
        */
    get_count: function() {
        var CountQuery = $L('doff.db.models.sql.subqueries', 'CountQuery');
        obj = this.clone();
        obj.clear_ordering(true);
        obj.clear_limits();
        obj.select_related = false;
        obj.related_select_cols = [];
        obj.related_select_fields = [];
        if (obj.select.length > 1) {
            obj = this.clone(CountQuery, {'_query':obj, 'where': this.where_class(), 'distinct': false});
            obj.select = [];
            obj.extra_select = new SortedDict();
        }
        obj.add_count_column();
        data = obj.execute_sql(SINGLE);
        if (!data)
            return 0;
        number = data[0];

        // Apply offset and limit constraints manually, since using LIMIT/OFFSET
        // in SQL (in variants that provide them) doesn't change the COUNT
        // output.
        number = Math.max(0, number - this.low_mark);
        if (this.high_mark)
            number = Math.min(number, this.high_mark - this.low_mark);

        return number;
    },

            as_sql: function(wl, wa){

        var with_limits = wl || true,
            with_col_aliases = wa || false;

        this.pre_sql_setup();
        var out_cols = this.get_columns(with_col_aliases);
        var ordering = this.get_ordering();

        /* retorna el from/where y los parametros en un arreglo */
        var [from_, f_params] = this.get_from_clause();
        var [where, w_params] = this.where.as_sql(this.quote_name_unless_alias.bind(this));

        var params = [];
                    var result = ["SELECT"];
        
                    if (this.distinct)
                            result.push("DISTINCT");
                    result.push(out_cols.concat(this.ordering_aliases).join(', '));
                    result.push("FROM");
                    
        result = result.concat(from_);
        params = params.concat(f_params);

                    if (where){
                            result.push('WHERE %s'.subs(where));
            params = params.concat(w_params);
        }

        if (bool(this.extra_where)) {
            if (!where)
                result.push('WHERE');
            else
                result.push('AND');
            result.push(this.extra_where.join(' AND '));
        }

        if (bool(this.group_by)){
            var grouping = this.get_grouping();
            result.push('GROUP BY %s'.subs(grouping.join(', ')));
        }

        if (bool(this.having)) {
            having = this.get_having();
            result.push('HAVING %s'.subs(having[0].join(', ')));
            params = params.concat(having[1]);
        }

        if (bool(ordering))
            result.push('ORDER BY %s'.subs(ordering.join(', ')));

        if (with_limits) {
            if (this.high_mark)
                result.push('LIMIT %s'.subs(this.high_mark - this.low_mark));
            if (this.low_mark)
                if (this.high_mark) {
                    val = this.connection.no_limit_value();
                    if (val)
                        result.push('LIMIT %s'.subs(val));
                result.push('OFFSET %s' % this.low_mark);
                }
        }
        params = params.concat(this.extra_params);
        return [result.join(' '), params];
            },

    /*
        * Merge the 'rhs' query into the current one (with any 'rhs' effects
        * being applied *after* (that is, "to the right of") anything in the
        * current query. 'rhs' is not modified during a call to this function.
        * The 'connector' parameter describes how to connect filters from the
        * 'rhs' query.
        */
    combine: function(rhs, connector) {

        assert(this.model == rhs.model, "Cannot combine queries on two different base models.");
        assert(this.can_filter(), "Cannot combine queries once a slice has been taken.");
        assert(this.distinct == rhs.distinct, "Cannot combine a unique query with a non-unique query.");

        // Work out how to relabel the rhs aliases, if necessary.
        change_map = {};
        used = new Set();
        conjunction = (connector == AND);
        first = true;
        for each (var alias in rhs.tables) {
            if (!rhs.alias_refcount[alias])
                // An unused alias.
                continue;
            promote = (rhs.alias_map[alias][JOIN_TYPE] == this.LOUTER);
            //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
            new_alias = this.join(rhs.rev_join_map[alias], (conjunction && !first), used, promote, !conjunction);
            used.add(new_alias);
            change_map[alias] = new_alias;
            first = false;
        }
        // So that we don't exclude valid results in an "or" query combination,
        // the first join that is exclusive to the lhs (self) must be converted
        // to an outer join.
        if (!conjunction)
            for each (var alias in this.tables.slice(1, this.tables.length))
                if (this.alias_refcount[alias] == 1) {
                    this.promote_alias(alias, true);
                    break;
                }

        // Now relabel a copy of the rhs where-clause and add it to the current
        // one.
        if (bool(rhs.where)) {
            w = deepcopy(rhs.where);
            w.relabel_aliases(change_map);
            if (!bool(this.where))
                // Since 'self' matches everything, add an explicit "include
                // everything" where-constraint so that connections between the
                // where clauses won't exclude valid results.
                this.where.add(new EverythingNode(), AND);
        } else if (bool(this.where)) {
            // rhs has an empty where clause.
            w = this.where_class();
            w.add(new EverythingNode(), AND);
        }
        else
            w = this.where_class();
        this.where.add(w, connector);

        // Selection columns and extra extensions are those provided by 'rhs'.
        this.select = [];
        for each (var col in rhs.select) {
            if (isarray(col))
                this.select.push([change_map.get(col[0], col[0]), col[1]])
            else {
                item = deepcopy(col);
                item.relabel_aliases(change_map);
                this.select.push(item)
            }
        }
        this.select_fields = copy(rhs.select_fields);

        if (connector == OR) {
            // It would be nice to be able to handle this, but the queries don't
            // really make sense (or return consistent value sets). Not worth
            // the extra complexity when you can write a real query instead.
            if (bool(this.extra_select) && bool(rhs.extra_select))
                throw new ValueError("When merging querysets using 'or', you cannot have extra(select=...) on both sides.");
            if (bool(this.extra_where) && bool(rhs.extra_where))
                throw new ValueError("When merging querysets using 'or', you cannot have extra(where=...) on both sides.");
        }
        this.extra_select.update(rhs.extra_select);
        this.extra_tables = this.extra_tables.concat(rhs.extra_tables);
        this.extra_where = this.extra_where.concat(rhs.extra_where);
        this.extra_params = this.extra_params.concat(rhs.extra_params);

        // Ordering uses the 'rhs' ordering, unless it has none, in which case
        // the current ordering is used.
        this.order_by = rhs.order_by && copy(rhs.order_by) || this.order_by;
        this.extra_order_by = rhs.extra_order_by || this.extra_order_by;
    },

    /*
        * Does any necessary class setup immediately prior to producing SQL. This
        * is for things that can't necessarily be done in __init__ because we
        * might not have all the pieces in place at that time.
        */
    pre_sql_setup: function() {

        if (!bool(this.tables))
            //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
            this.join([null, this.model._meta.db_table, null, null]);
        if (this.select_related && !bool(this.related_select_cols))
            this.fill_related_selections();
    },

    /*
        * Return the list of columns to use in the select statement. If no
        * columns have been specified, returns all columns relating to fields in
        * the model.
        * If 'with_aliases' is true, any column names that are duplicated
        * (without the table names) are given unique aliases. This is needed in
        * some cases to avoid ambiguitity with nested queries.
        */
    get_columns: function(with_aliases) {

        var with_aliases = with_aliases || false;
        var qn = this.quote_name_unless_alias.bind(this);
        var qn2 = this.connection.ops.quote_name;
        var result = ['(%s) AS %s'.subs(col[0], qn2(alias)) for ([alias, col] in this.extra_select)];
        var aliases = new Set(this.extra_select.keys());
        if (with_aliases)
            col_aliases = copy(aliases);
        else
            col_aliases = new Set();
        if (bool(this.select)) {
            for each (var col in this.select) {
                if (isarray(col)) {
                    r = '%s.%s'.subs(qn(col[0]), qn(col[1]));
                    if (with_aliases && include(col_aliases, col[1])) {
                        c_alias = 'Col%s'.subs(col_aliases.length);
                        result.push('%s AS %s'.subs(r, c_alias));
                        aliases.add(c_alias);
                        col_aliases.add(c_alias);
                    }
                    else {
                        result.push(r);
                        aliases.add(r);
                        col_aliases.add(col[1]);
                    }
                }
                else {
                    result.push(col.as_sql(qn));
                    if (col['alias']) {
                        aliases.add(col.alias);
                        col_aliases.add(col.alias);
                    }
                }
            }
        }
        else if (this.default_cols) {
            var [cols, new_aliases] = this.get_default_columns(with_aliases, col_aliases);
            result = result.concat(cols);
            aliases.update(new_aliases);
        }
        for each (var [table, col] in this.related_select_cols) {
            r = '%s.%s'.subs(qn(table), qn(col));
            if (with_aliases && include(col_aliases, col)) {
                c_alias = 'Col%s'.subs(col_aliases.length);
                result.push('%s AS %s'.subs(r, c_alias));
                aliases.add(c_alias);
                col_aliases.add(c_alias);
            }
            else {
                result.push(r);
                aliases.add(r);
                col_aliases.add(col);
            }
        }
        this._select_aliases = aliases;
        return result;
    },

    /*
        * Computes the default columns for selecting every field in the base
        * model.
        * Returns a list of strings, quoted appropriately for use in SQL
        * directly, as well as a set of aliases used in the select statement (if
        * 'as_pairs' is True, returns a list of (alias, col_name) pairs instead
        *  of strings as the first component and None as the second component).
        */
    get_default_columns: function(with_aliases, col_aliases, start_alias, opts, as_pairs) {

        var with_aliases = with_aliases || false;
        var col_aliases = col_aliases || null;
        var table_alias = start_alias || this.tables[0];
        var opts = opts || this.model._meta;
        var as_pairs = as_pairs || false;
        var result = [];

        var root_pk = opts.pk.column;
        var seen = dict({'None': table_alias});
        qn = this.quote_name_unless_alias.bind(this);
        qn2 = this.connection.ops.quote_name;
        aliases = new Set();
        for each (var [field, model] in opts.get_fields_with_model()) {
            model = model || 'None';
            var alias = seen.get(model);
            if (!alias) {
                alias = this.join([table_alias, model._meta.db_table, root_pk, model._meta.pk.column]);
                seen.set(model, alias);
            }
            if (as_pairs) {
                result.push([alias, field.column]);
                continue;
            }
            if (with_aliases && field.column in col_aliases) {
                c_alias = 'Col%s'.subs(col_aliases.length);
                result.push('%s.%s AS %s'.subs(qn(alias), qn2(field.column), c_alias));
                col_aliases.add(c_alias);
                aliases.add(c_alias);
            }
            else {
                r = '%s.%s'.subs(qn(alias), qn2(field.column));
                result.push(r);
                aliases.add(r);
                if (with_aliases)
                    col_aliases.add(field.column);
            }
        }
        if (as_pairs)
            return [result, null]
        return [result, aliases];
    },

    /*
        * Returns a list of strings that are joined together to go after the
        * "FROM" part of the query, as well as a list any extra parameters that
        * need to be included. Sub-classes, can override this to create a
        * from-clause via a "select", for example (e.g. CountQuery).
        * This should only be called after any SQL construction methods that
        * might change the tables we need. This means the select columns and
        * ordering must be done first.
        */
    get_from_clause: function() {

        var result = [];
        var qn = this.quote_name_unless_alias.bind(this);
        var qn2 = this.connection.ops.quote_name;
        var first = true;
        for each (alias in this.tables) {
            if (!this.alias_refcount[alias])
                continue;
            try {
                var [name, alias, join_type, lhs, lhs_col, col, nullable] = this.alias_map[alias];
            }
            catch (e if e instanceof KeyError) {
                // Extra tables can end up in self.tables, but not in the
                // alias_map if they aren't in a join. That's OK. We skip them.
                continue;
            }
            alias_str = (alias != name && ' %s'.subs(alias) || '');
            if (join_type && !first)
                result.push('%s %s%s ON (%s.%s = %s.%s)'.subs(join_type, qn(name), alias_str, qn(lhs), qn2(lhs_col), qn(alias), qn2(col)));
            else {
                connector = !first && ', ' || '';
                result.push('%s%s%s'.subs(connector, qn(name), alias_str));
            }
            first = false;
        }
        for each (var t in this.extra_tables) {
            var [alias, unused] = this.table_alias(t);
            // Only add the alias if it's not already present (the table_alias()
            // calls increments the refcount, so an alias refcount of one means
            // this is the only reference.
            if (!(alias in this.alias_map) || this.alias_refcount[alias] == 1) {
                connector = !first && ', ' || '';
                result.push('%s%s'.(connector, qn(alias)));
                first = false;
            }
        }
        return [result, []];
    },

    /* Returns a tuple representing the SQL elements in the "group by" clause. */
    get_grouping: function() {
        var qn = this.quote_name_unless_alias.bind(this);
        var result = [];
        for each (var col in this.group_by)
            if (isarray(col))
                result.push('%s.%s'.subs(qn(col[0]), qn(col[1])));
            else if (isfunction(col['as_sql']))
                result.push(col.as_sql(qn));
            else
                result.push(new String(col));
        return result;
    },

    /*
        * Returns a tuple representing the SQL elements in the "having" clause.
        * By default, the elements of self.having have their as_sql() method
        * called or are returned unchanged (if they don't have an as_sql()
        * method).
        */
    get_having: function() {
        var result = [];
        var params = [];
        for each (elt in this.having)
            if (isfunction(elt['as_sql'])) {
                var [sql, params] = elt.as_sql();
                result.push(sql);
                params = params.concat(params);
            }
            else {
                result.push(elt);
            }
        return [result, params];
    },

    /*
        * Returns list representing the SQL elements in the "order by" clause.
        Also sets the ordering_aliases attribute on this instance to a list of
        extra aliases needed in the select.

        Determining the ordering SQL can change the tables we need to include,
        so this should be run *before* get_from_clause().
        */
    get_ordering: function () {
        if (bool(this.extra_order_by))
            ordering = this.extra_order_by;
        else if (!this.default_ordering)
            ordering = this.order_by;
        else
            ordering = bool(this.order_by)? this.order_by: this.model._meta.ordering;
        var qn = this.quote_name_unless_alias.bind(this);
        var qn2 = this.connection.ops.quote_name;
        var distinct = this.distinct;
        var select_aliases = this._select_aliases;
        var result = [];
        var ordering_aliases = [];
        if (this.standard_ordering)
            var [asc, desc] = ORDER_DIR['ASC'];
        else
            var [asc, desc] = ORDER_DIR['DESC'];

        // It's possible, due to model inheritance, that normal usage might try
        // to include the same field more than once in the ordering. We track
        // the table/column pairs we use and discard any after the first use.
        processed_pairs = new Set();

        for each (var field in ordering) {
            if (field == '?') {
                result.push(this.connection.ops.random_function_sql());
                continue;
            }
            if (isnumber(field)) {
                if (field < 0) {
                    order = desc;
                    field = -field;
                }
                else
                    order = asc;
                result.push('%s %s'.subs(field, order));
                continue;
            }
            if (include(field, '.')) {
                // This came in through an extra(order_by=...) addition. Pass it
                // on verbatim.
                var [col, order] = get_order_dir(field, asc);
                var [table, col] = col.split('.', 1);
                if (![table, col] in processed_pairs)
                    var elt = '%s.%s'.subs(qn(table), col);
                    processed_pairs.add([table, col]);
                    if (!distinct || elt in select_aliases)
                        result.push('%s %s'.subs(elt, order));
            }
            else if (!(this.extra_select.has_key(get_order_dir(field)[0]))) {
                // 'col' is of the form 'field' or 'field1__field2' or
                // '-field1__field2__field', etc.
                // find_ordering_name(name, opts, alias, default_order, already_seen)
                for each (var element in this.find_ordering_name(field, this.model._meta, null, asc)) {
                    var [table, col, order] = element;
                    if (!(include(processed_pairs, [table, col]))) {
                        elt = '%s.%s'.subs(qn(table), qn2(col));
                        processed_pairs.add([table, col]);
                        if (distinct && !(elt in select_aliases))
                            ordering_aliases.push(elt);
                        result.push('%s %s'.subs(elt, order));
                    }
                }
            }
            else {
                var [col, order] = get_order_dir(field, asc);
                elt = qn2(col);
                if (distinct && !(col in select_aliases))
                    ordering_aliases.push(elt);
                result.push('%s %s'.subs(elt, order));
            }
        }
        this.ordering_aliases = ordering_aliases;
        return result;
    },

    /*
        * Returns the table alias (the name might be ambiguous, the alias will
        not be) and column name for ordering by the given 'name' parameter.
        The 'name' is of the form 'field1__field2__...__fieldN'.
        */
    find_ordering_name: function(name, opts, alias, default_order, already_seen) {
        var alias = alias || null;
        var default_order = default_order || 'ASC';
        var already_seen = already_seen || null;

        var [name, order] = get_order_dir(name, default_order);
        var pieces = name.split(LOOKUP_SEP);
        if (!alias)
            alias = this.get_initial_alias();
        var [field, target, opts, joins, last, extra] = this.setup_joins(pieces, opts, alias, false);
        //TODO: Algo para levantar indices negativos en los array
        alias = joins[joins.length - 1];
        col = target.column;
        if (!field.rel) {
            // To avoid inadvertent trimming of a necessary alias, use the
            // refcount to show that we are referencing a non-relation field on
            // the model.
            this.ref_alias(alias);
        }

        // Must use left outer joins for nullable fields.
        this.promote_alias_chain(joins);

        // If we get to this point and the field is a relation to another model,
        // append the default ordering for that model.
        if (field.rel && joins.length > 1 && opts.ordering) {
            // Firstly, avoid infinite loops.
            if (!already_seen)
                already_seen = new Set();
            join_tuple = [this.alias_map[j][TABLE_NAME] for (j in joins)];
            if (join_tuple in already_seen)
                throw new FieldError('Infinite loop caused by ordering.');
            already_seen.add(join_tuple);

            var results = [];
            for each (var item in opts.ordering)
                //find_ordering_name(name, opts, alias, default_order, already_seen)
                results = results.concat(this.find_ordering_name(item, opts, alias, order, already_seen));
            return results;
        }

        if (alias) {
            // We have to do the same "final join" optimisation as in
            // add_filter, since the final column might not otherwise be part of
            // the select set (so we can't order on it).
            while (1) {
                join = this.alias_map[alias];
                if (col != join[RHS_JOIN_COL]) break;
                this.unref_alias(alias);
                alias = join[LHS_ALIAS];
                col = join[LHS_JOIN_COL];
            }
        }
        return [[alias, col, order]];
    },

    /*
        * Returns a table alias for the given table_name and whether this is a
        new alias or not.

        If 'create' is true, a new alias is always created. Otherwise, the
        most recently created alias for the table (if one exists) is reused.
        */
    table_alias: function(table_name, create) {
        var create = create || false;
        current = this.table_map[table_name];
        if (!create && current) {
            alias = current[0];
            this.alias_refcount[alias] = this.alias_refcount[alias] + 1;
            return [alias, false];
        }

        // Create a new alias for this table.
        if (current) {
            alias = '%s%s'.subs(this.alias_prefix, new String(this.alias_map.length + 1));
            current.push(alias);
        } else {
            // The first occurence of a table uses the table name directly.
            alias = table_name;
            this.table_map[alias] = [alias];
        }
        this.alias_refcount[alias] = 1;
        this.tables.push(alias);
        return [alias, true];
    },

    /* Increases the reference count for this alias. */
    ref_alias: function(alias) {
        this.alias_refcount[alias] = this.alias_refcount[alias] + 1;
    },

    /* Decreases the reference count for this alias. */
    unref_alias: function(alias) {
        this.alias_refcount[alias] = this.alias_refcount[alias] - 1;
    },

    /*
        * Promotes the join type of an alias to an outer join if it's possible
        for the join to contain NULL values on the left. If 'unconditional' is
        False, the join is only promoted if it is nullable, otherwise it is
        always promoted.

        Returns True if the join was promoted.
        */
    promote_alias: function(alias, unconditional) {
        if ((unconditional || this.alias_map[alias][NULLABLE]) && this.alias_map[alias][JOIN_TYPE] != this.LOUTER) {
            data = array(this.alias_map[alias]);
            data[JOIN_TYPE] = this.LOUTER;
            this.alias_map[alias] = data;
            return true;
        }
        return false;
    },

    /*
        * Walks along a chain of aliases, promoting the first nullable join and
        any joins following that. If 'must_promote' is True, all the aliases in
        the chain are promoted.
        */
    promote_alias_chain: function(chain, must_promote) {
        for each (var alias in chain)
            if (this.promote_alias(alias, must_promote))
                must_promote = true;
    },

    /*
        * Given a "before" copy of the alias_refcounts dictionary (as
        'initial_refcounts') and a collection of aliases that may have been
        changed or created, works out which aliases have been created since
        then and which ones haven't been used and promotes all of those
        aliases, plus any children of theirs in the alias tree, to outer joins.
        */
    promote_unused_aliases: function(initial_refcounts, used_aliases) {
        // FIXME: There's some (a lot of!) overlap with the similar OR promotion
        // in add_filter(). It's not quite identical, but is very similar. So
        // pulling out the common bits is something for later.
        considered = {};
        for each (var alias in this.tables)
            if (!include(used_aliases, alias))
                continue;
            if (!include(initial_refcounts, alias) || this.alias_refcount[alias] == initial_refcounts[alias]) {
                parent = self.alias_map[alias][LHS_ALIAS];
                must_promote = considered.get(parent, false);
                promoted = this.promote_alias(alias, must_promote);
                considered[alias] = must_promote || promoted;
            }
    },

    /*
        * Changes the aliases in change_map (which maps old-alias -> new-alias),
        relabelling any references to them in select columns and the where
        clause.
        */
    change_aliases: function(change_map) {
        assert (new Set(change_map.keys()).intersection(new Set(change_map.values())) == new Set())

        // 1. Update references in "select" and "where".
        this.where.relabel_aliases(change_map);
        for (var [pos, col] in Iterator(this.select)) {
            if (isarray(col)) {
                old_alias = col[0];
                this.select[pos] = [change_map.get(old_alias, old_alias), col[1]];
            } else {
                col.relabel_aliases(change_map);
            }
        }

        // 2. Rename the alias in the internal table/alias datastructures.
        for (var [old_alias, new_alias] in change_map.iteritems()) {
            alias_data = array(this.alias_map[old_alias]);
            alias_data[RHS_ALIAS] = new_alias;

            t = this.rev_join_map[old_alias];
            data = array(this.join_map[t]);
            data[data.index(old_alias)] = new_alias;
            this.join_map[t] = array(data);
            this.rev_join_map[new_alias] = t;
            delete this.rev_join_map[old_alias];
            this.alias_refcount[new_alias] = this.alias_refcount[old_alias];
            delete this.alias_refcount[old_alias];
            this.alias_map[new_alias] = array(alias_data);
            delete this.alias_map[old_alias];

            table_aliases = this.table_map[alias_data[TABLE_NAME]];
            for (var [pos, alias] in Iterator(table_aliases)) {
                if (alias == old_alias) {
                    table_aliases[pos] = new_alias;
                    break;
                }
            }
            for (var [pos, alias] in Iterator(this.tables)) {
                if (alias == old_alias) {
                    this.tables[pos] = new_alias;
                    break;
                }
            }
        }
        // 3. Update any joins that refer to the old alias.
        for (var [alias, data] in this.alias_map.iteritems()) {
            lhs = data[LHS_ALIAS];
            if (include(change_map, lhs)) {
                data = array(data);
                data[LHS_ALIAS] = change_map[lhs];
                this.alias_map[alias] = array(data);
            }
        }
    },

    /*
        * Changes the alias prefix to the next letter in the alphabet and
        relabels all the aliases. Even tables that previously had no alias will
        get an alias after this call (it's mostly used for nested queries and
        the outer query will already be using the non-aliased table name).

        Subclasses who create their own prefix should override this method to
        produce a similar result (a new prefix and relabelled aliases).

        The 'exceptions' parameter is a container that holds alias names which
        should not be changed.
        */
    bump_prefix: function(exceptions) {
        var exceptions = exceptions || [];
        current = ord(this.alias_prefix);
        assert(current < ord('Z'));
        prefix = chr(current + 1);
        this.alias_prefix = prefix;
        change_map = {};
        for (var [pos, alias] in Iterator(this.tables)) {
            if (include(exceptions, alias)) continue;
            new_alias = '%s%d'.subs(prefix, pos);
            change_map[alias] = new_alias;
            this.tables[pos] = new_alias;
        }
        this.change_aliases(change_map);
    },

    /*
        * Returns the first alias for this query, after increasing its reference count.
        */
    get_initial_alias: function() {
        if (bool(this.tables)) {
            var alias = this.tables[0];
            this.ref_alias(alias);
        } else {
            //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
            var alias = this.join([null, this.model._meta.db_table, null, null]);
        }
        return alias;
    },

    /*
        * Returns the number of tables in this query with a non-zero reference count.
        */
    count_active_tables: function() {
        return [1 for each (count in values(this.alias_refcount)) if (count)].length;
    },

    /*
        * Returns an alias for the join in 'connection', either reusing an
        existing alias for that join or creating a new one. 'connection' is a
        tuple (lhs, table, lhs_col, col) where 'lhs' is either an existing
        table alias or a table name. The join correspods to the SQL equivalent
        of::

            lhs.lhs_col = table.col

        If 'always_create' is True and 'reuse' is None, a new alias is always
        created, regardless of whether one already exists or not. Otherwise
        'reuse' must be a set and a new join is created unless one of the
        aliases in `reuse` can be used.

        If 'exclusions' is specified, it is something satisfying the container
        protocol ("foo in exclusions" must work) and specifies a list of
        aliases that should not be returned, even if they satisfy the join.

        If 'promote' is True, the join type for the alias will be LOUTER (if
        the alias previously existed, the join type will be promoted from INNER
        to LOUTER, if necessary).

        If 'outer_if_first' is True and a new join is created, it will have the
        LOUTER join type. This is used when joining certain types of querysets
        and Q-objects together.

        If 'nullable' is True, the join can potentially involve NULL values and
        is a candidate for promotion (to "left outer") when combining querysets.
        */
    join: function(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse) {
        var always_create = always_create || false;
        var exclusions = exclusions || [];
        var promote = promote || false;
        var outer_if_first = outer_if_first || false;
        var nullable = nullable || false;
        var reuse = reuse || null;
        var [lhs, table, lhs_col, col] = connection;
        if (lhs in this.alias_map) {
            lhs_table = this.alias_map[lhs][TABLE_NAME];
        } else { lhs_table = lhs; }

        if (reuse && always_create && this.table_map[table]) {
            // Convert the 'reuse' to case to be "exclude everything but the
            // reusable set, minus exclusions, for this table".
            exclusions = new Set(this.table_map[table]).difference(reuse).union(new Set(exclusions));
            always_create = false;
        }
        t_ident = [lhs_table, table, lhs_col, col];
        if (!always_create) {
            var map = this.join_map[t_ident] || [];
            for each (var alias in map) {
                if (!include(exclusions, alias)) {
                    if (lhs_table && !this.alias_refcount[this.alias_map[alias][LHS_ALIAS]])
                        // The LHS of this join tuple is no longer part of the
                        // query, so skip this possibility.
                        continue;
                    if (this.alias_map[alias][LHS_ALIAS] != lhs) continue;
                    this.ref_alias(alias);
                    if (promote) this.promote_alias(alias);
                    return alias;
                }
            }
        }
        // No reuse is possible, so we need a new alias.
        var [alias, none] = this.table_alias(table, true);
        if (!lhs)
            // Not all tables need to be joined to anything. No join type
            // means the later columns are ignored.
            join_type = null;
        else if (promote || outer_if_first)
            join_type = this.LOUTER;
        else
            join_type = this.INNER;
        join = [table, alias, join_type, lhs, lhs_col, col, nullable];
        this.alias_map[alias] = join;
        if (!isundefined(this.join_map[t_ident]))
            this.join_map[t_ident] = this.join_map[t_ident].concat([alias]);
        else
            this.join_map[t_ident] = [alias];
        this.rev_join_map[alias] = t_ident;
        return alias;
    },

    /*
        * Fill in the information needed for a select_related query. The current
        depth is measured as the number of connections away from the root model
        (for example, cur_depth=1 means we are looking at models with direct
        connections to the root model).
        */
    fill_related_selections: function(opts, root_alias, cur_depth, used, requested, restricted, nullable, dupe_set, avoid_set) {

        var opts = opts || null;
        var root_alias = root_alias || null;
        var cur_depth = cur_depth || 1;
        var used = used || null;
        var requested = requested || null;
        var restricted = restricted || null;
        var nullable = nullable || null;
        var dupe_set = dupe_set || null;
        var avoid_set = avoid_set || null;
        if (!restricted && this.max_depth && cur_depth > this.max_depth)
            // We've recursed far enough; bail out.
            return;

        if (!opts) {
            opts = this.get_meta();
            root_alias = this.get_initial_alias();
            this.related_select_cols = [];
            this.related_select_fields = [];
        }
        if (!used)
            used = new Set();
        if (!dupe_set)
            dupe_set = new Set();
        if (!avoid_set)
            avoid_set = new Set();
        orig_dupe_set = dupe_set;

        // Setup for the case when only particular related fields should be
        // included in the related selection.
        if (!requested && !restricted) {
            if (this.select_related instanceof Dict) {
                requested = this.select_related;
                restricted = true;
            } else { restricted = false };
        }
        for each (var [f, model] in opts.get_fields_with_model())
            if (!select_related_descend(f, restricted, requested))
                continue;
            // The "avoid" set is aliases we want to avoid just for this
            // particular branch of the recursion. They aren't permanently
            // forbidden from reuse in the related selection tables (which is
            // what "used" specifies).
            avoid = copy(avoid_set);
            dupe_set = copy(orig_dupe_set);
            table = f.rel.to._meta.db_table;
            if (nullable || f.none)
                promote = true;
            else
                promote = false;
            if (model) {
                int_opts = opts;
                alias = root_alias;
                for (int_model in opts.get_base_chain(model))
                    var lhs_col = int_opts.parents[int_model].column;
                    dedupe = !isundefined(opts.duplicate_targets[lhs_col]);
                    if (dedupe)
                        avoid.update(this.dupe_avoidance.get([id(opts), lhs_col], []));
                        dupe_set.add([opts, lhs_col]);
                    int_opts = int_model._meta;
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, int_opts.db_table, lhs_col, int_opts.pk.column], null, used, promote);
                    for ([dupe_opts, dupe_col] in dupe_set)
                        this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
            } else { alias = root_alias };

            dedupe = !isundefined(opts.duplicate_targets[f.column]);
            if (bool(dupe_set) || dedupe) {
                avoid.update(this.dupe_avoidance.get([id(opts), f.column], []));
                if (dedupe)
                    dupe_set.add([opts, f.column]);
            }
            //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
            alias = this.join([alias, table, f.column, f.rel.get_related_field().column], null, used.union(avoid), promote);
            used.add(alias);
            //get_default_columns(with_aliases, col_aliases, start_alias, opts, as_pairs)
            this.related_select_cols = this.related_select_cols.concat(this.get_default_columns( null, null, alias, f.rel.to._meta, true)[0]);
            this.related_select_fields.extend(f.rel.to._meta.fields);
            if (restricted)
                next = requested.get(f.name, {});
            else
                next = false;
            if (f.none)
                new_nullable = f.none;
            else
                new_nullable = null;
            for ([dupe_opts, dupe_col] in dupe_set)
                this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
            this.fill_related_selections(f.rel.to._meta, alias, cur_depth + 1, used, next, restricted, new_nullable, dupe_set, avoid);
    },

    /*
        * Add a single filter to the query. The 'filter_expr' is a pair:
        (filter_string, value). E.g. ('name__contains', 'fred')

        If 'negate' is True, this is an exclude() filter. It's important to
        note that this method does not negate anything in the where-clause
        object when inserting the filter constraints. This is because negated
        filters often require multiple calls to add_filter() and the negation
        should only happen once. So the caller is responsible for this (the
        caller will normally be add_q(), so that as an example).

        If 'trim' is True, we automatically trim the final join group (used
        internally when constructing nested queries).

        If 'can_reuse' is a set, we are processing a component of a
        multi-component filter (e.g. filter(Q1, Q2)). In this case, 'can_reuse'
        will be a set of table aliases that can be reused in this filter, even
        if we would otherwise force the creation of new aliases for a join
        (needed for nested Q-filters). The set is updated by this method.

        If 'process_extras' is set, any extra filters returned from the table
        joining process will be processed. This parameter is set to False
        during the processing of extra filters to avoid infinite recursion.
        */
    add_filter: function(filter_expr, connector, negate, trim, can_reuse, process_extras) {

        var connector = connector || AND;
        var negate = negate || false;
        var trim = trim || false;
        var can_reuse = can_reuse || null;
        var process_extras = process_extras || true;
        var [arg, value] = filter_expr;
        var parts = arg.split(LOOKUP_SEP);
        var lookup_type;
        if (!bool(parts))
            throw new FieldError("Cannot parse keyword query %r".subs(arg));

        // Work out the lookup type and remove it from 'parts', if necessary.
        if (parts.length == 1 || isundefined(this.query_terms[parts[parts.length - 1]]))
            var lookup_type = 'exact';
        else
            var lookup_type = parts.pop();

        // Interpret '__exact=None' as the sql 'is NULL'; otherwise, reject all
        // uses of None as a query value.
        if (!value) {
            if (lookup_type != 'exact')
                throw new ValueError("Cannot use None as a query value");
            lookup_type = 'isnull';
            value = true;
        }
        else if (value == '' && lookup_type == 'exact' && connection.features.interprets_empty_strings_as_nulls) {
            lookup_type = 'isnull';
            value = true;
        }
        else if (isfunction(value)) { value = value(); }

        var opts = this.get_meta();
        var alias = this.get_initial_alias();
        var allow_many = trim || !negate;

        try {
            [field, target, opts, join_list, last, extra_filters] = this.setup_joins(parts, opts, alias, true, allow_many, can_reuse, negate, process_extras);
        }
        catch (e if e instanceof MultiJoin) {
            this.split_exclude(filter_expr, parts.slice(0,e.level).join(LOOKUP_SEP), can_reuse);
            return;
        }
        var final = join_list.length;
        var penultimate = last.pop();
        if (penultimate == final)
            penultimate = last.pop();
        if (trim && join_list.length > 1) {
            var extra = join_list.slice(penultimate);
            var join_list = join_list.slice(0, penultimate);
            final = penultimate;
            penultimate = last.pop();
            col = this.alias_map[extra[0]][LHS_JOIN_COL];
            for (alias in extra)
                this.unref_alias(alias);
        } else { col = target.column; }
        alias = join_list[join_list.length - 1];

        while (final > 1) {
            // An optimization: if the final join is against the same column as
            // we are comparing against, we can go back one step in the join
            // chain and compare against the lhs of the join instead (and then
            // repeat the optimization). The result, potentially, involves less
            // table joins.
            join = this.alias_map[alias];
            if (col != join[RHS_JOIN_COL]) break;
            this.unref_alias(alias);
            alias = join[LHS_ALIAS];
            col = join[LHS_JOIN_COL];
            join_list = join_list.slice(0,-1);
            final = final - 1;
            if (final == penultimate)
                penultimate = last.pop();
        }
        if (lookup_type == 'isnull' && value == true && !negate && final > 1) {
            // If the comparison is against NULL, we need to use a left outer
            // join when connecting to the previous model. We make that
            // adjustment here. We don't do this unless needed as it's less
            // efficient at the database level.
            this.promote_alias(join_list[penultimate]);
        }

        if (connector == OR) {
            // Some joins may need to be promoted when adding a new filter to a
            // disjunction. We walk the list of new joins and where it diverges
            // from any previous joins (ref count is 1 in the table list), we
            // make the new additions (and any existing ones not used in the new
            // join list) an outer join.
            join_it = Iterator(join_list);
            table_it = Iterator(this.tables);
            join_it.next();
            table_it.next();
            table_promote = false;
            join_promote = false;
            for (join in join_it) {
                table = table_it.next();
                if (join == table && this.alias_refcount[join] > 1) { continue; }
                join_promote = this.promote_alias(join);
                if (table != join) { table_promote = this.promote_alias(table); }
                break;
            }
            this.promote_alias_chain(join_it, join_promote);
            this.promote_alias_chain(table_it, table_promote);
        }
        this.where.add([alias, col, field, lookup_type, value], connector);

        if (negate) {
            this.promote_alias_chain(join_list);
            if (lookup_type != 'isnull') {
                if (final > 1) {
                    for (alias in join_list) {
                        if (this.alias_map[alias][JOIN_TYPE] == this.LOUTER) {
                            j_col = this.alias_map[alias][RHS_JOIN_COL];
                            entry = this.where_class();
                            entry.add([alias, j_col, null, 'isnull', true], AND);
                            entry.negate();
                            this.where.add(entry, AND);
                            break;
                        }
                    }
                } else if (!(lookup_type == 'in' && !value) && field.none) {
                    // Leaky abstraction artifact: We have to specifically
                    // exclude the "foo__in=[]" case from this handling, because
                    // it's short-circuited in the Where class.
                    entry = this.where_class();
                    entry.add([alias, col, null, 'isnull', true], AND);
                    entry.negate();
                    this.where.add(entry, AND);
                }
            }
        }
        if (can_reuse) { can_reuse.update(join_list) }
        if (process_extras) {
            for each (var filter in extra_filters) {
                this.add_filter(filter, null, negate, null, can_reuse, false);
            }
        }
    },

    /*
        * Compute the necessary table joins for the passage through the fields
        given in 'names'. 'opts' is the Options class for the current model
        (which gives the table we are joining to), 'alias' is the alias for the
        table we are joining to. If dupe_multis is True, any many-to-many or
        many-to-one joins will always create a new alias (necessary for
        disjunctive filters). If can_reuse is not None, it's a list of aliases
        that can be reused in these joins (nothing else can be reused in this
        case). Finally, 'negate' is used in the same sense as for add_filter()
        -- it indicates an exclude() filter, or something similar. It is only
        passed in here so that it can be passed to a field's extra_filter() for
        customised behaviour.

        Returns the final field involved in the join, the target database
        column (used for any 'where' constraint), the final 'opts' value and the
        list of tables joined.
        */
    setup_joins: function(names, opts, alias, dupe_multis, allow_many, allow_explicit_fk, can_reuse, negate, process_extras) {
        var allow_many = allow_many || true;
        var allow_explicit_fk = allow_explicit_fk || false;
        var can_reuse = can_reuse || null;
        var negate = negate || false;
        var process_extras = process_extras || true;
        var int_alias = null;
        var pos = 0;
        var name = null;
        var joins = [alias];
        var last = [0];
        var dupe_set = new Set();
        var exclusions = new Set();
        var extra_filters = [];
        for (var element in Iterator(names)) {
            pos = element[0];
            name = element[1];
            if (int_alias != null)
                exclusions.add(int_alias);
            exclusions.add(alias);
            last.push(joins.length);
            if (name == 'pk')
                name = opts.pk.name;
            try {
                [field, model, direct, m2m] = opts.get_field_by_name(name);
            }
            catch (e if e instanceof FieldDoesNotExist) {
                if (!bool(opts.fields)) {
                    names = opts.get_all_field_names();
                    throw new FieldError("Cannot resolve keyword %r into field. Choices are: %s".subs(name, names.join(", ")));
                }
                for each (var f in opts.fields) {
                    if (allow_explicit_fk && name == f.attname) {
                        // XXX: A hack to allow foo_id to work in values() for
                        // backwards compatibility purposes. If we dropped that
                        // feature, this could be removed.
                        [field, model, direct, m2m] = opts.get_field_by_name(f.name);
                        break;
                    }
                }
            }
            if (!allow_many && (m2m || !direct)) {
                for each (var alias in joins)
                    this.unref_alias(alias);
                throw new MultiJoin(pos + 1);
            }
            if (model) {
                // The field lives on a base class of the current model.
                for each (var int_model in opts.get_base_chain(model)) {
                    lhs_col = opts.parents[int_model].column;
                    dedupe = !isundefined(opts.duplicate_targets[lhs_col]);
                    if (dedupe) {
                        exclusions.update(this.dupe_avoidance.get([id(opts), lhs_col], []));
                        dupe_set.add([opts, lhs_col]);
                    }
                    opts = int_model._meta;
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, opts.db_table, lhs_col, opts.pk.column], null, exclusions);
                    joins.push(alias);
                    exclusions.add(alias);
                    for ([dupe_opts, dupe_col] in dupe_set)
                        this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
                }
            }
            var cached_data = opts._join_cache[name];
            var orig_opts = opts;
            var dupe_col = direct && field.column || field.field.column;
            var dedupe = !isundefined(opts.duplicate_targets[dupe_col]);
            if (bool(dupe_set) || dedupe) {
                if (dedupe)
                    dupe_set.add([opts, dupe_col]);
                exclusions.update(this.dupe_avoidance.get([id(opts), dupe_col], []));
            }
            if (process_extras && !isundefined(field['extra_filters'])) {
                extra_filters = extra_filters.concat(field.extra_filters(names, pos, negate));
            }
            if (direct) {
                if (m2m) {
                    // Many-to-many field defined on the current model.
                    if (bool(cached_data)) {
                        [table1, from_col1, to_col1, table2, from_col2, to_col2, opts, target] = cached_data;
                    } else {
                        var table1 = field.m2m_db_table();
                        var from_col1 = opts.pk.column;
                        var to_col1 = field.m2m_column_name();
                        var opts = field.rel.to._meta;
                        var table2 = opts.db_table;
                        var from_col2 = field.m2m_reverse_name();
                        var to_col2 = opts.pk.column;
                        var target = opts.pk;
                        orig_opts._join_cache[name] = [table1, from_col1, to_col1, table2, from_col2, to_col2, opts, target];
                    }
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    int_alias = this.join([alias, table1, from_col1, to_col1], dupe_multis, exclusions, null, null, true, can_reuse);
                    if (int_alias == table2 && from_col2 == to_col2) {
                        joins.push(int_alias);
                        alias = int_alias;
                    } else {
                        //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                        alias = this.join([int_alias, table2, from_col2, to_col2], dupe_multis, exclusions, null, null, true, can_reuse);
                        joins = joins.concat([int_alias, alias]);
                    }
                } else if (field.rel) {
                    // One-to-one or many-to-one field
                    if (cached_data) {
                        [table, from_col, to_col, opts, target] = cached_data;
                    } else {
                        opts = field.rel.to._meta;
                        target = field.rel.get_related_field();
                        table = opts.db_table;
                        from_col = field.column;
                        to_col = target.column;
                        orig_opts._join_cache[name] = [table, from_col, to_col, opts, target];
                    }
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, table, from_col, to_col], null, exclusions, null, null, field.none);
                    joins.push(alias);
                } else {
                    // Non-relation fields.
                    target = field;
                    break;
                }
            } else {
                orig_field = field;
                field = field.field;
                if (m2m) {
                    // Many-to-many field defined on the target model.
                    if (cached_data) {
                        [table1, from_col1, to_col1, table2, from_col2, to_col2, opts, target] = cached_data;
                    } else {
                        table1 = field.m2m_db_table();
                        from_col1 = opts.pk.column;
                        to_col1 = field.m2m_reverse_name();
                        opts = orig_field.opts;
                        table2 = opts.db_table;
                        from_col2 = field.m2m_column_name();
                        to_col2 = opts.pk.column;
                        target = opts.pk;
                        orig_opts._join_cache[name] = [table1, from_col1, to_col1, table2, from_col2, to_col2, opts, target];
                    }
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    int_alias = this.join([alias, table1, from_col1, to_col1], dupe_multis, exclusions, null, null, true, can_reuse);
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([int_alias, table2, from_col2, to_col2], dupe_multis, exclusions, null, null, true, can_reuse);
                    joins = joins.concat([int_alias, alias]);
                } else {
                    // One-to-many field (ForeignKey defined on the target model)
                    if (cached_data) {
                        [table, from_col, to_col, opts, target] = cached_data;
                    } else {
                        local_field = opts.get_field_by_name(field.rel.field_name)[0];
                        opts = orig_field.opts;
                        table = opts.db_table;
                        from_col = local_field.column;
                        to_col = field.column;
                        target = opts.pk;
                        orig_opts._join_cache[name] = [table, from_col, to_col, opts, target];
                    }
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, table, from_col, to_col], dupe_multis, exclusions, null, null, true, can_reuse);
                    joins.push(alias);
                }
            }
            for ([dupe_opts, dupe_col] in dupe_set) {
                try {
                    this.update_dupe_avoidance(dupe_opts, dupe_col, int_alias);
                }
                catch (e if e instanceof NameError) {
                    this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
                }
            }
        }
        if (pos != names.length - 1) {
            if (pos == names.length - 2)
                throw new FieldError("Join on field %r not permitted. Did you misspell %r for the lookup type?".subs(name, names[pos + 1]));
            else
                throw new FieldError("Join on field %r not permitted.".subs(name));
        }
        return [field, target, opts, joins, last, extra_filters];
    },

    /*
        * For a column that is one of multiple pointing to the same table, update
        * the internal data structures to note that this alias shouldn't be used
        * for those other columns.
        */
    update_dupe_avoidance: function(opts, col, alias) {
        var ident = id(opts);
        for (name in opts.duplicate_targets[col]) {
            if (!this.dupe_avoidance.has_key([ident, name]))
                this.dupe_avoidance.set([ident, name], new Set([alias]));
            this.dupe_avoidance.get([ident, name]).add(alias);
        }
    },

    /*
        * When doing an exclude against any kind of N-to-many relation, we need
        to use a subquery. This method constructs the nested query, given the
        original exclude filter (filter_expr) and the portion up to the first
        N-to-many relation field.
        */
    split_exclude: function(filter_expr, prefix, can_reuse) {
        var query = new Query(this.model, this.connection);
        query.add_filter(filter_expr, can_reuse);
        query.bump_prefix();
        query.clear_ordering(true);
        query.set_start(prefix);
        //add_filter(filter_expr, connector, negate, trim, can_reuse, process_extras)
        this.add_filter(['%s__in'.subs(prefix), query], null, true, true, can_reuse);

        // If there's more than one join in the inner query (before any initial
        // bits were trimmed -- which means the last active table is more than
        // two places into the alias list), we need to also handle the
        // possibility that the earlier joins don't match anything by adding a
        // comparison to NULL (e.g. in
        // Tag.objects.exclude(parent__parent__name='t1'), a tag with no parent
        // would otherwise be overlooked).
        active_positions = [pos for ([pos, count] in Iterator(query.alias_refcount.itervalues())) if (count)];
        if (active_positions[active_positions.length - 1] > 1)
            //add_filter(filter_expr, connector, negate, trim, can_reuse, process_extras)
            this.add_filter(['%s__isnull'.subs(prefix), false], null, true, true, can_reuse);
    },

    /*
        * Adds the given (model) fields to the select set. The field names are
        * added in the order specified.
        */
    add_fields: function(field_names, allow_m2m) {

        allow_m2m = allow_m2m || true;
        var alias = this.get_initial_alias();
        var opts = this.get_meta();
        try {
            for each (name in field_names)
                var [field, target, u2, joins, u3, u4] = this.setup_joins(name.split(LOOKUP_SEP), opts, alias, false, allow_m2m, true);
                var final_alias = joins[joins.length -1];
                var col = target.column;
                if (joins.length > 1) {
                    var join = this.alias_map[final_alias];
                    if (col == join[RHS_JOIN_COL]) {
                        this.unref_alias(final_alias);
                        final_alias = join[LHS_ALIAS];
                        col = join[LHS_JOIN_COL];
                        joins = joins.slice(0,-1);
                    }
                }
                this.promote_alias_chain(joins.slice(1));
                this.select.push([final_alias, col]);
                this.select_fields.push(field);
        }
        catch (e if e instanceof MultiJoin) {
            throw new FieldError("Invalid field name: '%s'".subs(name));
        }
        catch (e if e instanceof FieldError) {
            var names = opts.get_all_field_names() + this.extra_select.keys()
            names.sort();
            throw new FieldError("Cannot resolve keyword %r into field. Choices are: %s".subs(name, names.join(", ")))
        }
    },

    /*
        * Adds items from the 'ordering' sequence to the query's "order by"
        clause. These items are either field names (not column names) --
        possibly with a direction prefix ('-' or '?') -- or ordinals,
        corresponding to column positions in the 'select' list.

        If 'ordering' is empty, all ordering is cleared from the query.
        */
    add_ordering: function() {

        var [ordering, kwargs] = Query.prototype.add_ordering.extra_arguments(arguments);
        var errors = [];
        for each (var item in ordering)
            var m = item.match(ORDER_PATTERN);
            if (!bool(m) || m[0] != item)
                errors.push(item);
        if (bool(errors))
            throw new FieldError('Invalid order_by arguments: %s'.subs(errors));
        if (bool(ordering))
            this.order_by = this.order_by.concat(ordering);
        else
            this.default_ordering = false;
    },

    /*
        * Removes any ordering settings. If 'force_empty' is True, there will be
        * no ordering in the resulting query (not even the model's default).
        */
    clear_ordering: function(force_empty) {
        this.order_by = [];
        this.extra_order_by = [];
        if (force_empty)
            this.default_ordering = false;
    },

    /*
        * Converts the query to do count(...) or count(distinct(pk)) in order to
        get its size.
        */
    add_count_column: function() {
        // TODO: When group_by support is added, this needs to be adjusted so
        // that it doesn't totally overwrite the select list.
        var select = null;
        if (!this.distinct) {
            if (!bool(this.select))
                select = new Count();
            else {
                assert (this.select.length == 1,"Cannot add count col with multiple cols in 'select': %s" % this.select);
                select = new Count(this.select[0]);
            }
        } else {
            var opts = this.model._meta;
            if (!bool(this.select)) {
                //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                select = new Count([this.join([null, opts.db_table, null, null]), opts.pk.column], true);
            } else {
                // Because of SQL portability issues, multi-column, distinct
                // counts need a sub-query -- see get_count() for details.
                assert (this.select.length == 1, "Cannot add count col with multiple cols in 'select'.");
                select = new Count(this.select[0], true);
            }
            // Distinct handling is done in Count(), so don't do it at this
            // level.
            this.distinct = false;
        }
        this.select = [select];
        this.select_fields = [null];
        this.extra_select = new SortedDict();
    },

    /*
        * Sets up the select_related data structure so that we only select
        * certain related models (as opposed to all models, when
        * self.select_related=True).
        */
    add_select_related: function(fields) {
        var field_dict = dict();
        for each (var field in fields) {
            var d = field_dict;
            for (part in field.split(LOOKUP_SEP))
                d = d.setdefault(part, {});
        this.select_related = field_dict;
        this.related_select_cols = [];
        this.related_select_fields = [];
        }
    },

    /*
        * Adds data to the various extra_* attributes for user-created additions
        * to the query.
        */
    add_extra: function(select, select_params, where, params, tables, order_by) {
        if (select) {
            // We need to pair any placeholder markers in the 'select'
            // dictionary with their parameters in 'select_params' so that
            // subsequent updates to the select dictionary also adjust the
            // parameters appropriately.
            var select_pairs = new SortedDict();
            if (select_params)
                var param_iter = Iterator(select_params);
            else
                var param_iter = Iterator([]);
            for (var name in select) {
                var entry = new String(select[name]);
                var entry_params = [];
                var pos = entry.search("%s");
                while (pos != -1) {
                    entry_params.push(param_iter.next());
                    pos = entry.search("%s", pos + 2);
                }
                select_pairs.set(name, [entry, entry_params]);
            }
            // This is order preserving, since self.extra_select is a SortedDict.
            this.extra_select.update(select_pairs);
        }
        if (where)
            this.extra_where = this.extra_where.concat(array(where));
        if (params)
            this.extra_params = this.extra_params.concat(array(params));
        if (tables)
            this.extra_tables = this.extra_tables.concat(array(tables));
        if (order_by)
            this.extra_order_by = order_by;
    },

    /*
        * Removes any aliases in the extra_select dictionary that aren't in 'names'.
        * This is needed if we are selecting certain values that don't incldue
        * all of the extra_select names.
        */
    trim_extra_select: function(names) {
        for (var key in new Set(this.extra_select.keys()).difference(new Set(names)))
            this.extra_select.unset(key);
    },

    /* Sets the table from which to start joining. The start position is
        * specified by the related attribute from the base model. This will
        * automatically set to the select column to be the column linked from the
        * previous table.
        * This method is primarily for internal use and the error checking isn't
        * as friendly as add_filter(). Mostly useful for querying directly
        * against the join table of many-to-many relation in a subquery.
        */
    set_start: function(start) {
        var opts = this.model._meta;
        var alias = this.get_initial_alias();
        var [field, col, opts, joins, last, extra] = this.setup_joins(start.split(LOOKUP_SEP), opts, alias, false);
        var select_col = this.alias_map[joins[1]][LHS_JOIN_COL];
        var select_alias = alias;

        // The call to setup_joins added an extra reference to everything in
        // joins. Reverse that.
        for (var alias in joins)
            this.unref_alias(alias);

        // We might be able to trim some joins from the front of this query,
        // providing that we only traverse "always equal" connections (i.e. rhs
        // is *always* the same value as lhs).
        for (alias in joins.slice(1)){
            var join_info = this.alias_map[alias];
            if (join_info[LHS_JOIN_COL] != select_col || join_info[JOIN_TYPE] != this.INNER)
                break
            this.unref_alias(select_alias);
            select_alias = join_info[RHS_ALIAS];
            select_col = join_info[RHS_JOIN_COL];
        }
        this.select = [[select_alias, select_col]];
    },

    /*
        * Run the query against the database and returns the result(s). The
        * return value is a single data item if result_type is SINGLE, or an
        * iterator over the results if the result_type is MULTI.
        * result_type is either MULTI (use fetchmany() to retrieve all rows),
        * SINGLE (only retrieve a single row), or None (no results expected, but
        * the cursor is returned, since it's used by subclasses such as
        * InsertQuery).
        */
    execute_sql: function(result_type) {

        result_type = isundefined(result_type)?MULTI:result_type;
        var sql = null, params = null;
        try {
            [sql, params] = this.as_sql();
            if (!sql)
                throw new EmptyResultSet();
        } catch (e if e instanceof EmptyResultSet) {
            if (result_type == MULTI) {
                return empty_iter();
            } else { return; }
        }
    
        var cursor = this.connection.cursor();
        cursor.execute(sql, params);

        if (!result_type)
            return cursor;
        if (result_type == SINGLE) {
            if (bool(this.ordering_aliases))
                return cursor.fetchone().slice(0, -results.ordering_aliases.length);
            return cursor.fetchone();
        }

        // The MULTI case.
        var result = null;
        if (bool(this.ordering_aliases)) {
            result = order_modified_iter(cursor, this.ordering_aliases.length);
        } else {
            result = multi_iter(cursor, this.connection.features.empty_fetchmany_value);
        }
        /* if (!this.connection.features.can_use_chunked_reads)
            return array(result);*/
        return result;
    },

    /*
        * Adds a Q-object to the current filter.
        * Can also be used to add anything that has an 'add_to_query()' method.
        */
    add_q: function(q_object, used_aliases) {

        var used_aliases = used_aliases || this.used_aliases;
        var connector = AND, subtree = false;
        if (q_object['add_to_query'])
            q_object.add_to_query(this, used_aliases);
        else {
            if (bool(this.where) && q_object.connector != AND && q_object.length > 1) {
                this.where.start_subtree(AND);
                subtree = true;
            }
            for each (var child in q_object.children) {
                var refcounts_before = null;
                if (connector == OR)
                    refcounts_before = copy(this.alias_refcount);
                if (child instanceof Node) {
                    this.where.start_subtree(connector);
                    this.add_q(child, used_aliases);
                    this.where.end_subtree();
                }
                else
                    //add_filter(filter_expr, connector, negate, trim, can_reuse, process_extras)
                    this.add_filter(child, connector, q_object.negated, null, used_aliases)
                if (connector == OR)
                    // Aliases that were newly added or not used at all need to
                    // be promoted to outer joins if they are nullable relations.
                    // (they shouldn't turn the whole conditional into the empty
                    // set just because they don't match anything).
                    this.promote_unused_aliases(refcounts_before, used_aliases);
                connector = q_object.connector;
            }
            if (q_object.negated)
                this.where.negate();
            if (subtree)
                this.where.end_subtree();
        }
        if (this.filter_is_sticky)
            this.used_aliases = used_aliases;
    },

    /*
        * Adjusts the limits on the rows retrieved. We use low/high to set these,
        * as it makes it more Pythonic to read and write. When the SQL query is
        * created, they are converted to the appropriate offset and limit values.
        * Any limits passed in here are applied relative to the existing
        * constraints. So low is added to the current low value and both will be
        * clamped to any existing high value.
        */
    set_limits: function(low, high) {
    
        if (high) {
            if (this.high_mark)
                this.high_mark = Number.min(this.high_mark, this.low_mark + high);
            else
                this.high_mark = this.low_mark + high;
        }
        if (low) {
            if (this.high_mark)
                this.low_mark = Number.min(this.high_mark, this.low_mark + low);
            else
                this.low_mark = this.low_mark + low;
        }
    },

    /* Clears any existing limits. */
    clear_limits: function() {
        this.low_mark = 0;
        this.high_mark = null;
    },

    /*
        * Returns True if adding filters to this instance is still possible.
        * Typically, this means no limits or offsets have been put on the results.
        */
    can_filter: function() {
        return !(this.low_mark != 0 || this.high_mark != null);
    }
});

        /*
    * Returns the field name and direction for an order specification. For
    * example, '-foo' is returned as ('foo', 'DESC').
    * The 'default' param is used to indicate which way no prefix (or a '+'
    * prefix) should sort. The '-' prefix always sorts the opposite way.
    */
function get_order_dir(field, def) {
    var def = def || 'ASC';
    dirn = ORDER_DIR[def]
    if (field[0] == '-')
        return [field.substr(1), dirn[1]];
    return [field, dirn[0]];
}

// Returns an iterator containing no results.
function empty_iter() {
    yield Iterator([]).next();
}

// Returns an iterator containing no results.
function multi_iter(cursor, empty_fetchmany_value) {
    for (var result = cursor.fetchmany(GET_ITERATOR_CHUNK_SIZE); bool(result); result = cursor.fetchmany(GET_ITERATOR_CHUNK_SIZE))
        yield result;
    yield Iterator(empty_fetchmany_value).next();
}

/*
    * Yields blocks of rows from a cursor. We use this iterator in the special
    * case when extra output columns have been added to support ordering
    * requirements. We must trim those extra columns before anything else can use
    * the results, since they're only needed to make the SQL valid.
    */
function order_modified_iter(cursor, trim, sentinel){
    for (rows in cursor.fetchmany(GET_ITERATOR_CHUNK_SIZE))
        yield [r.slice(0, -trim) for (r in rows)];
}

/*
    * The information needed to join between model fields is something that is
    invariant over the life of the model, so we cache it in the model's Options
    class, rather than recomputing it all the time.

    This method initialises the (empty) cache when the model is created.
    */
function setup_join_cache(payload) {
    payload['sender']._meta._join_cache = {};
}

signals.class_prepared.connect(setup_join_cache);

$P({  'Query': Query  });

