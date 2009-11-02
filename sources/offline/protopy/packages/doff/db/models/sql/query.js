/* "doff.db.models.sql.query" */
require('doff.utils.tree', 'Node');
require('doff.utils.datastructures', 'SortedDict');
require('doff.db.base', 'connection');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.db.models.query_utils', 'select_related_descend');
require('doff.db.models.sql.datastructures', 'Count', 'EmptyResultSet', 'MultiJoin');
require('doff.db.models.sql.where', 'WhereNode', 'EverythingNode', 'AND', 'OR');
require('doff.core.exceptions', 'FieldError');
require('doff.db.models.sql.constants', '*');
require('copy', 'copy', 'deepcopy');
require('event');

/*
 * A single SQL query
 */
var Query = type('Query', [ object ], {
    INNER: 'INNER JOIN',
    LOUTER: 'LEFT OUTER JOIN',
    alias_prefix: 'T',
    query_terms: QUERY_TERMS,

    __init__: function(model, connection, where) {
        where = where || WhereNode;
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
        this.dupe_avoidance = new Dict();
        this.used_aliases = new Set();
        this.filter_is_sticky = false;
        this.included_inherited_models = new Dict();

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
        // A tuple that is a set of model field names and either True, if these
        // are the fields to defer, or False if these are the only fields to load.
        this.deferred_loading = [ new Set(), true ];
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

        var arg = new Arguments(arguments);
        var args = arg.args;
        var kwargs = arg.kwargs;
        klass = klass || this.constructor;
        var obj = type('Empty', object);
        obj.prototype.__proto__ = klass.prototype;
        obj.prototype.constructor = klass.prototype.constructor;
        obj = new obj();
        obj['__name__'] = this['__name__'];
        obj['__module__'] = this['__module__'];
        obj['__class__'] = this['__class__'];
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
        obj.included_inherited_models = copy(this.included_inherited_models);
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
        obj.deferred_loading = deepcopy(this.deferred_loading);
        if (this.filter_is_sticky && bool(this.used_aliases))
            obj.used_aliases = copy(this.used_aliases);
        else
            obj.used_aliases = new Set();
        obj.filter_is_sticky = false;
        extend(obj, kwargs);
        if (callable(obj['_setup_query']))
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
        var CountQuery = require('doff.db.models.sql.subqueries', 'CountQuery');
        var obj = this.clone();
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
        var data = obj.execute_sql(SINGLE);
        if (!data)
            return 0;
        var number = data[0];

        // Apply offset and limit constraints manually, since using LIMIT/OFFSET
        // in SQL (in variants that provide them) doesn't change the COUNT
        // output.
        number = Math.max(0, number - this.low_mark);
        if (this.high_mark)
            number = Math.min(number, this.high_mark - this.low_mark);

        return number;
    },

    as_sql: function(with_limits, with_col_aliases) {

        with_limits = with_limits || true;
        with_col_aliases = with_col_aliases || false;

        this.pre_sql_setup();
        var out_cols = this.get_columns(with_col_aliases);
        var ordering = this.get_ordering();

        /* retorna el from/where y los parametros en un arreglo */
        var [from_, f_params] = this.get_from_clause();
        var [where, w_params] = this.where.as_sql(getattr(this, 'quote_name_unless_alias'));

        var params = [];
        var result = ["SELECT"];

        if (this.distinct)
            result.push("DISTINCT");
        result.push(out_cols.concat(this.ordering_aliases).join(', '));
        result.push("FROM");

        result = result.concat(from_);
        params = params.concat(f_params);

        if (where) {
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
            if (this.low_mark) {
                if (this.high_mark == null) {
                    var val = this.connection.ops.no_limit_value();
                    if (val)
                        result.push('LIMIT %s'.subs(val));
                }
                result.push('OFFSET %s'.subs(this.low_mark));
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
        var change_map = {};
        var used = new Set();
        var conjunction = (connector == AND);
        var first = true;
        for each (var alias in rhs.tables) {
            if (!rhs.alias_refcount[alias])
                // An unused alias.
                continue;
            var promote = (rhs.alias_map[alias][JOIN_TYPE] == this.LOUTER);
            //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
            var new_alias = this.join(rhs.rev_join_map[alias], (conjunction && !first), used, promote, !conjunction);
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
            var w = deepcopy(rhs.where);
            w.relabel_aliases(change_map);
            if (!bool(this.where))
                // Since 'self' matches everything, add an explicit "include
                // everything" where-constraint so that connections between the
                // where clauses won't exclude valid results.
                this.where.add(new EverythingNode(), AND);
        } else if (bool(this.where)) {
            // rhs has an empty where clause.
            var w = new this.where_class();
            w.add(new EverythingNode(), AND);
        } else {
            var w = new this.where_class();
        }
        this.where.add(w, connector);

        // Selection columns and extra extensions are those provided by 'rhs'.
        this.select = [];
        for each (var col in rhs.select) {
            if (type(col) == Array) {
                this.select.push([change_map.get(col[0], col[0]), col[1]]);
            } else {
                item = deepcopy(col);
                item.relabel_aliases(change_map);
                this.select.push(item);
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
        if (!bool(this.select) && this.default_cols && !bool(this.included_inherited_models))
            this.setup_inherited_models()
        if (this.select_related && !bool(this.related_select_cols))
            this.fill_related_selections();
    },

    deferred_to_data: function(target, callback) {
        /*
        Converts the self.deferred_loading data structure to an alternate data
        structure, describing the field that *will* be loaded. This is used to
        compute the columns to select from the database and also by the
        QuerySet class to work out which fields are being initialised on each
        model. Models that have all their fields included aren't mentioned in
        the result, only those that have field restrictions in place.

        The "target" parameter is the instance that is populated (in place).
        The "callback" is a function that is called whenever a (model, field)
        pair need to be added to "target". It accepts three parameters:
        "target", and the model and list of fields being added for that model.
        */
        var [ field_names, defer ] = this.deferred_loading;
        if (!bool(field_names))
            return;
        var columns = new Set();
        var orig_opts = this.model._meta;
        var seen = new Dict();
        var must_include = new Dict();
        must_include.set(this.model, new Set([orig_opts.pk]));
        for (var field_name in field_names) {
            var parts = field_name.split(LOOKUP_SEP);
            var cur_model = this.model;
            var opts = orig_opts;
            for each (var name in parts.slice(0,-1)) {
                var old_model = cur_model;
                var source = opts.get_field_by_name(name)[0];
                cur_model = opts.get_field_by_name(name)[0].rel.to;
                opts = cur_model._meta;
                // Even if we're "just passing through" this model, we must add
                // both the current model's pk and the related reference field
                // to the things we select.
                must_include.get(old_model).add(source);
                add_to_dict(must_include, cur_model, opts.pk);
            }
            var [ field, model, x, y] = opts.get_field_by_name(parts.slice(-1));
            if (model == null)
                model = cur_model;
            add_to_dict(seen, model, field);
        }
        if (defer) {
            // We need to load all fields for each model, except those that
            // appear in "seen" (for all models that appear in "seen"). The only
            // slight complexity here is handling fields that exist on parent
            // models.
            var workset = new Dict();
            for each (var [ model, values ] in seen.items()) {
                for each (var field in model._meta.local_fields) {
                    if (include(values, field))
                        continue;
                    add_to_dict(workset, model, field);
                }
            }
            for each (var [ model, values ] in must_include.items()) {
                // If we haven't included a model in workset, we don't add the
                // corresponding must_include fields for that model, since an
                // empty set means "include all fields". That's why there's no
                // "else" branch here.
                if (include(workset, model))
                    workset.get(model).update(values);
            }
            for each (var [ model, values ] in workset.items())
                callback(target, model, values);
        } else {
            for each (var [ model, values ] in must_include.items()) {
                if (include(seen, model)) {
                    seen.get(model).update(values);
                } else {
                    // As we've passed through this model, but not explicitly
                    // included any fields, we have to make sure it's mentioned
                    // so that only the "must include" fields are pulled in.
                    seen.set(model, values);
                }
            }
            // Now ensure that every model in the inheritance chain is mentioned
            // in the parent list. Again, it must be mentioned to ensure that
            // only "must include" fields are pulled in.
            for (var model in orig_opts.get_parent_list()) {
                if (!include(seen, model))
                    seen.set(model, new Set());
            }
            for each (var [ model, values ] in seen.items()) {
                callback(target, model, values);
            }
        }
    },

    deferred_to_columns: function() {
        /*
        Converts the self.deferred_loading data structure to mapping of table
        names to sets of column names which are to be loaded. Returns the
        dictionary.
        */
        var columns = {};
        this.deferred_to_data(columns, this.deferred_to_columns_cb);
        return columns;
    },

    deferred_to_columns_cb: function(target, model, fields) {
        /*
        Callback used by deferred_to_columns(). The "target" parameter should
        be a set instance.
        */
        var table = model._meta.db_table;
        if (!include(target, table))
            target[table] = new Set();
        for (var field in fields) {
            target[table].add(field.column);
        }
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

        with_aliases = with_aliases || false;
        var qn = getattr(this, 'quote_name_unless_alias');
        var qn2 = this.connection.ops.quote_name;
        var result = ['(%s) AS %s'.subs(col[0], qn2(alias)) for each ([alias, col] in this.extra_select.items())];
        var aliases = new Set(this.extra_select.keys());
        if (with_aliases)
            var col_aliases = copy(aliases);
        else
            var col_aliases = new Set();
        if (bool(this.select)) {
            var only_load = this.deferred_to_columns();
            for each (var col in this.select) {
                if (isinstance(col, Array)) {
                    var [ alias, column ] = col;
                    var table = this.alias_map[alias][TABLE_NAME];
                    if (include(only_load, table) && !include(only_load[table], col))
                        continue;
                    var r = '%s.%s'.subs(qn(col[0]), qn(col[1]));
                    if (with_aliases) {
                        if (include(col_aliases, col[1])) {
                            var c_alias = 'Col%s'.subs(col_aliases.length);
                            result.push('%s AS %s'.subs(r, c_alias));
                            aliases.add(c_alias);
                            col_aliases.add(c_alias);
                        } else {
                            result.push('%s AS %s'.subs(r, qn2(col[1])));
                            aliases.add(r);
                            col_aliases.add(col[1]);
                        }
                    } else {
                        result.push(r);
                        aliases.add(r);
                        col_aliases.add(col[1]);
                    }
                } else {
                    result.push(col.as_sql(qn));
                    if (hasattr(col, 'alias')) {
                        aliases.add(col.alias);
                        col_aliases.add(col.alias);
                    }
                }
            }
        } else if (this.default_cols) {
            var [cols, new_aliases] = this.get_default_columns(with_aliases, col_aliases);
            result = result.concat(cols);
            aliases.update(new_aliases);
        }
        for each (var [table, col] in this.related_select_cols) {
            var r = '%s.%s'.subs(qn(table), qn(col));
            if (with_aliases && include(col_aliases, col)) {
                c_alias = 'Col%s'.subs(len(col_aliases));
                result.push('%s AS %s'.subs(r, c_alias));
                aliases.add(c_alias);
                col_aliases.add(c_alias);
            } else {
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

        with_aliases = with_aliases || false;
        col_aliases = col_aliases || null;
        opts = opts || this.model._meta;
        as_pairs = as_pairs || false;
        start_alias = start_alias || null; 
        //var table_alias = start_alias || this.tables[0];
        var result = [];
        var seen = new Dict({'None': start_alias});
        var qn = getattr(this, 'quote_name_unless_alias');
        var qn2 = this.connection.ops.quote_name;
        var aliases = new Set();
        var only_load = this.deferred_to_columns();

        for each (var [field, model] in opts.get_fields_with_model()) {
            model = model || 'None';
            if (start_alias) {
                var alias = seen.get(model);
                if (!alias) {
                    var link_field = opts.get_ancestor_link(model);
                    alias = this.join([start_alias, model._meta.db_table, link_field.column, model._meta.pk.column]);
                    seen.set(model, alias);
                }
            } else {
                var alias = this.included_inherited_models.get(model);
            }
            var table = this.alias_map[alias][TABLE_NAME]
            if (include(only_load, table) && !include(only_load[table], field.column))
                continue;
            if (as_pairs) {
                result.push([alias, field.column]);
                aliases.add(alias)
                continue;
            }
            if (with_aliases && include(col_aliases, field.column)) {
                c_alias = 'Col%s'.subs(len(col_aliases));
                result.push('%s.%s AS %s'.subs(qn(alias), qn2(field.column), c_alias));
                col_aliases.add(c_alias);
                aliases.add(c_alias);
            } else {
                var r = '%s.%s'.subs(qn(alias), qn2(field.column));
                result.push(r);
                aliases.add(r);
                if (with_aliases)
                    col_aliases.add(field.column);
            }
        }
        return [ result, aliases ];
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
        var qn = getattr(this, 'quote_name_unless_alias');
        var qn2 = this.connection.ops.quote_name;
        var first = true;
        for each (var alias in this.tables) {
            if (!this.alias_refcount[alias])
                continue;
            try {
                var [name, alias, join_type, lhs, lhs_col, col, nullable] = this.alias_map[alias];
            }
            catch (e if isinstance(e, KeyError)) {
                // Extra tables can end up in self.tables, but not in the
                // alias_map if they aren't in a join. That's OK. We skip them.
                continue;
            }
            var alias_str = (alias != name && ' %s'.subs(alias) || '');
            if (join_type && !first)
                result.push('%s %s%s ON (%s.%s = %s.%s)'.subs(join_type, qn(name), alias_str, qn(lhs), qn2(lhs_col), qn(alias), qn2(col)));
            else {
                var connector = !first && ', ' || '';
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
                var connector = !first && ', ' || '';
                result.push('%s%s'.(connector, qn(alias)));
                first = false;
            }
        }
        return [result, []];
    },

    /* Returns a tuple representing the SQL elements in the "group by" clause. */
    get_grouping: function() {
        var qn = getattr(this, 'quote_name_unless_alias');
        var result = [];
        for each (var col in this.group_by)
            if (type(col) == Array)
                result.push('%s.%s'.subs(qn(col[0]), qn(col[1])));
            else if (callable(col['as_sql']))
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
        for each (var elt in this.having)
            if (callable(elt['as_sql'])) {
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
    get_ordering: function() {
        if (bool(this.extra_order_by))
            var ordering = this.extra_order_by;
        else if (!this.default_ordering)
            var ordering = this.order_by;
        else
            var ordering = bool(this.order_by)? this.order_by: this.model._meta.ordering;
        var qn = getattr(this, 'quote_name_unless_alias');
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
        var processed_pairs = new Set();

        for each (var field in ordering) {
            if (field == '?') {
                result.push(this.connection.ops.random_function_sql());
                continue;
            }
            if (type(field) == Number) {
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
                if (!include(processed_pairs, [table, col]))
                    var elt = '%s.%s'.subs(qn(table), col);
                    processed_pairs.add([table, col]);
                    if (!distinct || elt in select_aliases)
                        result.push('%s %s'.subs(elt, order));
            } else if (!(this.extra_select.has_key(get_order_dir(field)[0]))) {
                // 'col' is of the form 'field' or 'field1__field2' or
                // '-field1__field2__field', etc.
                // find_ordering_name(name, opts, alias, default_order, already_seen)
                for each (var element in this.find_ordering_name(field, this.model._meta, null, asc)) {
                    var [table, col, order] = element;
                    if (!(include(processed_pairs, [table, col]))) {
                        var elt = '%s.%s'.subs(qn(table), qn2(col));
                        processed_pairs.add([table, col]);
                        if (distinct && !(elt in select_aliases))
                            ordering_aliases.push(elt);
                        result.push('%s %s'.subs(elt, order));
                    }
                }
            } else {
                var [col, order] = get_order_dir(field, asc);
                var elt = qn2(col);
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
        alias = alias || null;
        default_order = default_order || 'ASC';
        already_seen = already_seen || null;

        var [name, order] = get_order_dir(name, default_order);
        var pieces = name.split(LOOKUP_SEP);
        if (!alias)
            alias = this.get_initial_alias();
        var [field, target, opts, joins, last, extra] = this.setup_joins(pieces, opts, alias, false);

        alias = joins[joins.length - 1];
        var col = target.column;
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
                var join = this.alias_map[alias];
                if (col != join[RHS_JOIN_COL])
                    break;
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
        create = create || false;
        var current = this.table_map[table_name];
        var alias = null;
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
            var data = array(this.alias_map[alias]);
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
        var considered = {};
        for each (var alias in this.tables) {
            if (!include(used_aliases, alias))
                continue;
            if (!include(initial_refcounts, alias) || this.alias_refcount[alias] == initial_refcounts[alias]) {
                var parent = this.alias_map[alias][LHS_ALIAS];
                var must_promote = considered[parent] || false;
                var promoted = this.promote_alias(alias, must_promote);
                considered[alias] = must_promote || promoted;
            }
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
            if (isinstance(col, Array)) {
                var old_alias = col[0];
                this.select[pos] = [change_map.get(old_alias, old_alias), col[1]];
            } else {
                col.relabel_aliases(change_map);
            }
        }

        // 2. Rename the alias in the internal table/alias datastructures.
        for (var [old_alias, new_alias] in change_map.iteritems()) {
            var alias_data = array(this.alias_map[old_alias]);
            alias_data[RHS_ALIAS] = new_alias;

            var t = this.rev_join_map[old_alias];
            var data = array(this.join_map[t]);
            data[data.index(old_alias)] = new_alias;
            this.join_map[t] = array(data);
            this.rev_join_map[new_alias] = t;
            delete this.rev_join_map[old_alias];
            this.alias_refcount[new_alias] = this.alias_refcount[old_alias];
            delete this.alias_refcount[old_alias];
            this.alias_map[new_alias] = array(alias_data);
            delete this.alias_map[old_alias];

            var table_aliases = this.table_map[alias_data[TABLE_NAME]];
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
            var lhs = data[LHS_ALIAS];
            if (include(change_map, lhs)) {
                var data = array(data);
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
        exceptions = exceptions || [];
        var current = ord(this.alias_prefix);
        assert(current < ord('Z'));
        var prefix = chr(current + 1);
        this.alias_prefix = prefix;
        var change_map = {};
        for (var [pos, alias] in Iterator(this.tables)) {
            if (include(exceptions, alias)) continue;
            var new_alias = '%s%d'.subs(prefix, pos);
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
        return len([1 for each (count in values(this.alias_refcount)) if (count)]);
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
        always_create = always_create || false;
        exclusions = exclusions || [];
        promote = promote || false;
        outer_if_first = outer_if_first || false;
        nullable = nullable || false;
        reuse = reuse || null;
        var [lhs, table, lhs_col, col] = connection;
        if (lhs in this.alias_map)
            var lhs_table = this.alias_map[lhs][TABLE_NAME];
        else
            var lhs_table = lhs;

        if (reuse && always_create && table in this.table_map) {
            // Convert the 'reuse' to case to be "exclude everything but the
            // reusable set, minus exclusions, for this table".
            exclusions = new Set(this.table_map[table]).difference(reuse).union(new Set(exclusions));
            always_create = false;
        }
        var t_ident = [lhs_table, table, lhs_col, col];
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
            var join_type = null;
        else if (promote || outer_if_first)
            var join_type = this.LOUTER;
        else
            var join_type = this.INNER;
        var _join = [table, alias, join_type, lhs, lhs_col, col, nullable];
        this.alias_map[alias] = _join;
        if (this.join_map[t_ident])
            this.join_map[t_ident] = this.join_map[t_ident].concat([alias]);
        else
            this.join_map[t_ident] = [alias];
        this.rev_join_map[alias] = t_ident;
        return alias;
    },

    setup_inherited_models: function() {
        /*
        If the model that is the basis for this QuerySet inherits other models,
        we need to ensure that those other models have their tables included in
        the query.

        We do this as a separate step so that subclasses know which
        tables are going to be active in the query, without needing to compute
        all the select columns (this method is called from pre_sql_setup(),
        whereas column determination is a later part, and side-effect, of
        as_sql()).
        */
        var opts = this.model._meta;
        var root_alias = this.tables[0];
        var seen = new Dict({'None': root_alias});

        for each (var [ field, model ] in opts.get_fields_with_model()) {
            model = model || 'None';
            if (!include(seen, model)) {
                var link_field = opts.get_ancestor_link(model);
                seen.set(model, this.join([root_alias, model._meta.db_table, link_field.column, model._meta.pk.column]));
            }
        }
        this.included_inherited_models = seen;
    },

    remove_inherited_models: function() {
        /*
        Undoes the effects of setup_inherited_models(). Should be called
        whenever select columns (self.select) are set explicitly.
        */
        for each (var [ key, alias ] in this.included_inherited_models.items()) {
            if (key)
                this.unref_alias(alias);
        }
        this.included_inherited_models = new Dict();
    },
    /*
        * Fill in the information needed for a select_related query. The current
        depth is measured as the number of connections away from the root model
        (for example, cur_depth=1 means we are looking at models with direct
        connections to the root model).
        */
    fill_related_selections: function(opts, root_alias, cur_depth, used, requested, restricted, nullable, dupe_set, avoid_set) {

        opts = opts || null;
        root_alias = root_alias || null;
        cur_depth = cur_depth || 1;
        used = used || null;
        requested = requested || null;
        restricted = restricted || null;
        nullable = nullable || null;
        dupe_set = dupe_set || null;
        avoid_set = avoid_set || null;
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
            if (isinstance(this.select_related, Dict)) {
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
                    dedupe = bool(opts.duplicate_targets[lhs_col]);
                    if (dedupe)
                        avoid.update(this.dupe_avoidance.get([id(opts), lhs_col], []));
                        dupe_set.add([opts, lhs_col]);
                    int_opts = int_model._meta;
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, int_opts.db_table, lhs_col, int_opts.pk.column], null, used, promote);
                    for (var [dupe_opts, dupe_col] in dupe_set)
                        this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
            } else { alias = root_alias };

            dedupe = bool(opts.duplicate_targets[f.column]);
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
            this.related_select_fields = this.related_select_fields.concat(f.rel.to._meta.fields);
            if (restricted)
                var next = requested.get(f.name, {});
            else
                var next = false;
            if (f.none)
                new_nullable = f.none;
            else
                new_nullable = null;
            for (var [dupe_opts, dupe_col] in dupe_set)
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

        connector = connector || AND;
        negate = negate || false;
        trim = trim || false;
        can_reuse = can_reuse || null;
        process_extras = process_extras || true;
        var [arg, value] = filter_expr;
        var parts = arg.split(LOOKUP_SEP);
        if (!bool(parts))
            throw new FieldError("Cannot parse keyword query %r".subs(arg));

        // Work out the lookup type and remove it from 'parts', if necessary.
        if (len(parts) == 1 || !(parts[parts.length - 1] in this.query_terms))
            var lookup_type = 'exact';
        else
            var lookup_type = parts.pop();

        // Interpret '__exact=None' as the sql 'is NULL'; otherwise, reject all
        // uses of None as a query value.
        if (value == null) {
            if (lookup_type != 'exact')
                throw new ValueError("Cannot use None as a query value");
            lookup_type = 'isnull';
            value = true;
        } else if (value == '' && lookup_type == 'exact' && connection.features.interprets_empty_strings_as_nulls) {
            lookup_type = 'isnull';
            value = true;
        } else if (callable(value)) { 
            value = value(); 
        }

        var opts = this.get_meta();
        var alias = this.get_initial_alias();
        var allow_many = trim || !negate;

        try {
            var [field, target, opts, join_list, last, extra_filters] = this.setup_joins(parts, opts, alias, true, allow_many, can_reuse, negate, process_extras);
        }
        catch (e if isinstance(e, MultiJoin)) {
            this.split_exclude(filter_expr, parts.slice(0,e.level).join(LOOKUP_SEP), can_reuse);
            return;
        }
        var final = len(join_list);
        var penultimate = last.pop();
        if (penultimate == final)
            penultimate = last.pop();
        if (trim && len(join_list) > 1) {
            var extra = join_list.slice(penultimate);
            var join_list = join_list.slice(0, penultimate);
            final = penultimate;
            penultimate = last.pop();
            var col = this.alias_map[extra[0]][LHS_JOIN_COL];
            for each (var alias in extra)
                this.unref_alias(alias);
        } else { 
            var col = target.column; 
        }
        alias = join_list[join_list.length - 1];

        while (final > 1) {
            // An optimization: if the final join is against the same column as
            // we are comparing against, we can go back one step in the join
            // chain and compare against the lhs of the join instead (and then
            // repeat the optimization). The result, potentially, involves less
            // table joins.
            var join = this.alias_map[alias];
            if (col != join[RHS_JOIN_COL])
                break;
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
            for (var _join in join_it) {
                table = table_it.next();
                if (_join == table && this.alias_refcount[_join] > 1) { continue; }
                join_promote = this.promote_alias(_join);
                if (table != _join) { table_promote = this.promote_alias(table); }
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
                            var j_col = this.alias_map[alias][RHS_JOIN_COL];
                            var entry = new this.where_class();
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
                    var entry = new this.where_class();
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
        allow_many = allow_many || true;
        allow_explicit_fk = allow_explicit_fk || false;
        can_reuse = can_reuse || null;
        negate = negate || false;
        process_extras = process_extras || true;
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
                var [field, model, direct, m2m] = opts.get_field_by_name(name);
            } catch (e if isinstance(e, FieldDoesNotExist)) {
                if (!bool(opts.fields)) {
                    names = opts.get_all_field_names();
                    throw new FieldError("Cannot resolve keyword %r into field. Choices are: %s".subs(name, names.join(", ")));
                }
                for each (var f in opts.fields) {
                    if (allow_explicit_fk && name == f.attname) {
                        // XXX: A hack to allow foo_id to work in values() for
                        // backwards compatibility purposes. If we dropped that
                        // feature, this could be removed.
                        var [field, model, direct, m2m] = opts.get_field_by_name(f.name);
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
                    dedupe = bool(opts.duplicate_targets[lhs_col]);
                    if (dedupe) {
                        exclusions.update(this.dupe_avoidance.get([id(opts), lhs_col], []));
                        dupe_set.add([opts, lhs_col]);
                    }
                    opts = int_model._meta;
                    //join(connection, always_create, exclusions, promote, outer_if_first, nullable, reuse)
                    alias = this.join([alias, opts.db_table, lhs_col, opts.pk.column], null, exclusions);
                    joins.push(alias);
                    exclusions.add(alias);
                    for (var [dupe_opts, dupe_col] in dupe_set)
                        this.update_dupe_avoidance(dupe_opts, dupe_col, alias);
                }
            }
            var cached_data = opts._join_cache[name];
            var orig_opts = opts;
            var dupe_col = direct && field.column || field.field.column;
            var dedupe = bool(opts.duplicate_targets[dupe_col]);
            if (bool(dupe_set) || dedupe) {
                if (dedupe)
                    dupe_set.add([opts, dupe_col]);
                exclusions.update(this.dupe_avoidance.get([id(opts), dupe_col], []));
            }
            if (process_extras && field['extra_filters']) {
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
                var orig_field = field;
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
            for (var [dupe_opts, dupe_col] in dupe_set) {
                try {
                    this.update_dupe_avoidance(dupe_opts, dupe_col, int_alias);
                }
                catch (e if isinstance(e, NameError)) {
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
            for each (var name in field_names) {
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
        } catch (e if isinstance(e, MultiJoin)) {
            throw new FieldError("Invalid field name: '%s'".subs(name));
        } catch (e if isinstance(e, FieldError)) {
            var names = opts.get_all_field_names() + this.extra_select.keys();
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

        var arg = new Arguments(arguments);
        var ordering = arg.args;
        var errors = [];
        for each (var item in ordering) {
            var m = item.match(ORDER_PATTERN);
            if (!bool(m) || m[0] != item)
                errors.push(item);
        }
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
        var field_dict = new Dict();
        for each (var field in fields) {
            var d = field_dict;
            for each (var part in field.split(LOOKUP_SEP))
                d = d.setdefault(part, {});
        }
        this.select_related = field_dict;
        this.related_select_cols = [];
        this.related_select_fields = [];
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

    clear_deferred_loading: function() {
        /*
        Remove any fields from the deferred loading set.
        */
        this.deferred_loading = [ new Set(), true ];
    },

    add_deferred_loading: function(field_names) {
        /*
        Add the given list of model field names to the set of fields to
        exclude from loading from the database when automatic column selection
        is done. The new field names are added to any existing field names that
        are deferred (or removed from any existing field names that are marked
        as the only ones for immediate loading).
        */
        // Fields on related models are stored in the literal double-underscore
        // format, so that we can use a set datastructure. We do the foo__bar
        // splitting and handling when computing the SQL colum names (as part of
        // get_columns()).
        var [ existing, defer ] = this.deferred_loading;
        if (defer) {
            // Add to existing deferred names.
            this.deferred_loading = [ existing.union(field_names), true ];
        } else {
            // Remove names from the set of any existing "immediate load" names.
            this.deferred_loading = [ existing.difference(field_names), false ];
        }
    },

    add_immediate_loading: function(field_names) {
        /*
        Add the given list of model field names to the set of fields to
        retrieve when the SQL is executed ("immediate loading" fields). The
        field names replace any existing immediate loading field names. If
        there are field names already specified for deferred loading, those
        names are removed from the new field_names before storing the new names
        for immediate loading. (That is, immediate loading overrides any
        existing immediate values, but respects existing deferrals.)
        */
        var [ existing, defer ] = this.deferred_loading;
        if (defer) {
            // Remove any existing deferred names from the current set before
            // setting the new names.
            this.deferred_loading = [ new Set(field_names).difference(existing), false ];
        } else {
            // Replace any existing "immediate load" field names.
            this.deferred_loading = [ new Set(field_names), false ];
        }
    },

    get_loaded_field_names: function() {
        /*
        If any fields are marked to be deferred, returns a dictionary mapping
        models to a set of names in those fields that will be loaded. If a
        model is not in the returned dictionary, none of it's fields are
        deferred.

        If no fields are marked for deferral, returns an empty dictionary.
        */
        var collection = {};
        this.deferred_to_data(collection, this.get_loaded_field_names_cb);
        return collection;
    },

    get_loaded_field_names_cb: function(target, model, fields) {
        /*
        Callback used by get_deferred_field_names().
        */
        target[model] = new Set([f.name for each (f in fields)]);
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
        for (alias in joins)
            this.unref_alias(alias);

        // We might be able to trim some joins from the front of this query,
        // providing that we only traverse "always equal" connections (i.e. rhs
        // is *always* the same value as lhs).
        for (alias in joins.slice(1)) {
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
        result_type = (typeof(result_type) === 'undefined')? MULTI : result_type;
        var sql = null, params = null;
        try {
            [sql, params] = this.as_sql();
            if (!sql)
                throw new EmptyResultSet();
        } catch (e if isinstance(e, EmptyResultSet)) {
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
        used_aliases = used_aliases || this.used_aliases;
        var connector = AND;
        var subtree = false;
        if (callable(q_object['add_to_query'])) {
            q_object.add_to_query(this, used_aliases);
        } else {
            if (bool(this.where) && q_object.connector != AND && q_object.length > 1) {
                this.where.start_subtree(AND);
                subtree = true;
            }
            for each (var child in q_object.children) {
                var refcounts_before = null;
                if (connector == OR)
                    refcounts_before = copy(this.alias_refcount);
                if (isinstance(child, Node)) {
                    this.where.start_subtree(connector);
                    this.add_q(child, used_aliases);
                    this.where.end_subtree();
                } else {
                    //add_filter(filter_expr, connector, negate, trim, can_reuse, process_extras)
                    this.add_filter(child, connector, q_object.negated, null, used_aliases)
                }
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
                this.high_mark = Math.min(this.high_mark, this.low_mark + high);
            else
                this.high_mark = this.low_mark + high;
        }
        if (low) {
            if (this.high_mark)
                this.low_mark = Math.min(this.high_mark, this.low_mark + low);
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
    var dirn = ORDER_DIR[def]
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
function setup_join_cache(cls) {
    cls._meta._join_cache = {};
}

function add_to_dict(data, key, value) {
    /*
    A helper function to add "value" to the set of values for "key", whether or
    not "key" already exists.
    */
    if (include(data, key))
        data.get(key).add(value);
    else
        data.set(key, new Set([value]));
}

var hcp = event.subscribe('class_prepared', setup_join_cache);

publish({
    Query: Query
});