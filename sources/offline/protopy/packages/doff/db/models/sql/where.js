/* 'doff.db.models.sql.where' */
require('doff.utils.tree', 'Node');
require('doff.db.models.fields.base', 'Field');
require('doff.db.base', 'connection');
require('doff.db.models.sql.datastructures', 'EmptyResultSet', 'FullResultSet');
require('doff.db.models.query_utils', 'QueryWrapper');
require('datetime', 'datetime');

var AND = 'AND',
    OR = 'OR';

var EmptyShortCircuit = type('EmptyShortCircuit' , [Exception ]);

var WhereNode = type('WhereNode', [ Node ], {

    default_connector: AND,

    /* Los datos vienen en un objeto */
    add: function(data, connector) {
        if (!isinstance(data, Array)) {
            super(Node, this).add(data, connector);
            return;
        }

        var [ obj, lookup_type, value ] = data;
        if (hasattr(value, '__iter__'))
            // Consume any generators immediately, so that we can determine
            // emptiness and transform any non-empty values correctly.
            value = array(value);
        if (hasattr(obj, "process")) {
            try {
                var [ obj, params ] = obj.process(lookup_type, value);
            } catch (e if isinstance(e, [ EmptyShortCircuit, EmptyResultSet ])) {
                // There are situations where we want to short-circuit any
                // comparisons and make sure that nothing is returned. One
                // example is when checking for a NULL pk value, or the equivalent.
                super(Node, this).add(new NothingNode(), connector);
                return;
            }
        } else {
            var params = new Field().get_db_prep_lookup(lookup_type, value);
        }
        if (isinstance(value, Date))
            var annotation = Date;
        else if (hasattr(value, 'value_annotation'))
            var annotation = getattr(value, value_annotation);
        else
            var annotation = bool(value);

        super(Node, this).add([obj, lookup_type, annotation, params], connector);
    },

    __str__: function() {
        var [ sql, params ] = this.as_sql();
        return sql.subs(params);
    },

    as_sql: function(qn) {

        if (!qn)
            var qn = getattr(connection.ops, 'quote_name');
        if (!bool(this.children))
            return [null, []];

        var result = [],
            result_params = [],
            empty = true;
        for each (var child in this.children) {
            try {
                if (child['as_sql'])
                    var [ sql, params ] = child.as_sql(qn);
                else
                    var [ sql, params ] = this.make_atom(child, qn);
            } catch (e if isinstance(e, EmptyResultSet)) {
                if (this.connector == AND && !this.negated)
                    throw e;
                else if (this.negated)
                    empty = false;
                continue;
            } catch (e if isinstance(e, FullResultSet)) {
                if (this.connector == OR) {
                    if (this.negated) {
                        empty = true;
                        break;
                    }
                    return [ '', [] ];
                }
                if (this.negated)
                    empty = true;
                continue;
            }
            empty = false;
            if (sql) {
                result.push(sql);
                result_params = result_params.concat(params);
            }
        }

        if (empty)
            throw new EmptyResultSet();

        var conn = ' %s '.subs(this.connector);
        var sql_string = result.join(conn);
        if (sql_string) {
            if (this.negated)
                sql_string = 'NOT (%s)'.subs(sql_string);
            else if (this.children.length != 1)
                sql_string = '(%s)'.subs(sql_string);
        }
        return [sql_string, result_params];
    },

    make_atom: function(child, qn) {
        
        var [ lvalue, lookup_type, value_annot, params ] = child;
        if (isinstance(lvalue, Array))
            // A direct database column lookup.
            var field_sql = this.sql_for_columns(lvalue, qn);
        else
            // A smart object with an as_sql() method.
            var field_sql = lvalue.as_sql(qn);

        if (value_annot == Date)
            var cast_sql = connection.ops.datetime_cast_sql();
        else
            var cast_sql = '%s';

        if (hasattr(params, 'as_sql')) {
            var [ extra, params ] = params.as_sql(qn);
            cast_sql = '';
        } else
            var extra = '';

        if (connection.operators[lookup_type]) {
            var format = "%s %%s %%s".subs(connection.ops.lookup_cast(lookup_type));
            return [format.subs(field_sql, connection.operators[lookup_type].subs(cast_sql), extra), params];
        }

        if (lookup_type == 'in') {
            if (!value_annot)
                throw new EmptyResultSet();
            if (extra)
                return ['%s IN %s'.subs(field_sql, extra), params];
            return ['%s IN (%s)'.subs(field_sql, '%s'.times(params.length, ', ')), params];
        } else if (include(['range', 'year'], lookup_type))
            return ['%s BETWEEN %%s and %%s'.subs(field_sql), params];
        else if (include(['month', 'day'], lookup_type))
            return ['%s = %%s'.subs(connection.ops.date_extract_sql(lookup_type, field_sql)), params];
        else if (lookup_type == 'isnull')
            return ['%s IS %sNULL'.subs(field_sql, (! value_annot && 'NOT ' || '')), []];
        else if (lookup_type == 'search')
            return [connection.ops.fulltext_search_sql(field_sql), params];
        else if (include(['regex', 'iregex'], lookup_type))
            return [connection.ops.regex_lookup(lookup_type).subs(field_sql, cast_sql), params];

        throw new TypeError('Invalid lookup_type: ' + lookup_type);
    },

    sql_for_columns: function(data, qn) {
        /*
        Returns the SQL fragment used for the left-hand side of a column
        constraint (for example, the "T1.foo" portion in the clause
        "WHERE ... T1.foo = 6").
        */
        var [ table_alias, name, db_type ] = data;
        if (table_alias)
            var lhs = '%s.%s'.subs(qn(table_alias), qn(name));
        else
            var lhs = qn(name);
        return connection.ops.field_cast_sql(db_type).subs(lhs);
    },

    relabel_aliases: function(change_map, node) {
        if (!node)
            node = this;
        for (var [pos, child] in Iterator(node.children)) {
            if (child['relabel_aliases'])
                child.relabel_aliases(change_map);
            else if (isinstance(child, Node))
                this.relabel_aliases(change_map, child);
            else {
                if (isinstance(child[0], Array)) {
                    var elt = array(child[0]);
                    if (elt[0] in change_map) {
                        elt[0] = change_map[elt[0]];
                        node.children[pos] = [ elt ].concat(child.slice(1, child.length));
                    }
                } else {
                    child[0].relabel_aliases(change_map);
                }

                // Check if the query value also requires relabelling
                if (hasattr(child[3], 'relabel_aliases'))
                    child[3].relabel_aliases(change_map);
            }
        }
    }
});

var EverythingNode = type('EverythingNode', [ object ], {

    as_sql: function(qn) {
        throw new FullResultSet();
    },

    relabel_aliases: function(change_map, node) {
        return;
    }
});

var NothingNode = type('NothingNode', [ object ], {

    as_sql: function(qn) {
        throw new EmptyResultSet();
    },

    relabel_aliases: function(change_map, node) {
        return;
    }
});

/*
 * An object that can be passed to WhereNode.add() and knows how to
 * pre-process itself prior to including in the WhereNode.
 */
var Constraint = type('Constraint', [ object ], {

    __init__: function(alias, col, field) {
        this.alias = alias;
        this.col = col;
        this.field = field;
    },

    process: function(lookup_type, value) {
        /*
         * Returns a tuple of data suitable for inclusion in a WhereNode
         * instance.
         */
        // Because of circular imports, we need to import this here.
        require('doff.db.models.base', 'ObjectDoesNotExist');
        try {
            if (this.field) {
                var params = this.field.get_db_prep_lookup(lookup_type, value);
                var db_type = this.field.db_type();
            } else {
                // This branch is used at times when we add a comparison to NULL
                // (we don't really want to waste time looking up the associated
                // field object at the calling location).
                var params = new Field().get_db_prep_lookup(lookup_type, value);
                var db_type = null;
            }
        } catch (e if isinstance(e, ObjectDoesNotExist )) { 
            throw new EmptyShortCircuit();
        }
        return [ [ this.alias, this.col, db_type ] , params ];
    }
});

publish({
    AND: AND,
    OR: OR,
    WhereNode: WhereNode,
    EverythingNode: EverythingNode,
    NothingNode: NothingNode,
    Constraint: Constraint
});
