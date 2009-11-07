require('doff.core.exceptions', 'FieldError');
require('doff.db.base', 'connection');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('doff.db.models.sql.constants', 'LOOKUP_SEP');

var SQLEvaluator = type('SQLEvaluator', [ object ], {
    __init__: function(expression, query, allow_joins) {
        allow_joins = isundefined(allow_joins)? true : allow_joins;
        this.expression = expression;
        this.opts = query.get_meta();
        this.cols = {};

        this.contains_aggregate = false;
        this.expression.prepare(this, query, allow_joins);
    },

    as_sql: function(qn) {
        return this.expression.evaluate(this, qn);
    },

    relabel_aliases: function(change_map) {
        for each (var [node, col] in items(this.cols))
            this.cols[node] = [ change_map[col[0]] || col[0], col[1] ];
    },

    //#####################################################
    //# Vistor methods for initial expression preparation #
    //#####################################################

    prepare_node: function(node, query, allow_joins) {
        for each (var child in node.children) {
            if (callable(child['prepare']))
                child.prepare(this, query, allow_joins);
        }
    },

    prepare_leaf: function(node, query, allow_joins) {
        if (!allow_joins && include(node.name, LOOKUP_SEP))
            throw new FieldError("Joined field references are not permitted in this query");

        var field_list = node.name.split(LOOKUP_SEP);
        if (len(field_list) == 1 && include(query.aggregate_select.keys(), node.name)) {
            this.contains_aggregate = true;
            this.cols[node] = query.aggregate_select[node.name];
        } else {
            try {
                var [ field, source, opts, join_list, last, none ] = query.setup_joins( field_list, query.get_meta(), query.get_initial_alias(), false);
                var [ col, none, join_list ] = query.trim_joins(source, join_list, last, false);

                this.cols[node] = [ join_list.slice(-1), col ];
            } catch (e if isintance(e, FieldDoesNotExist)) {
                throw new FieldError("Cannot resolve keyword %s into field. Choices are: %s".subs(this.name, [f.name for each (f in this.opts.fields)]));
            }
        }
    },

    //##################################################
    //# Vistor methods for final expression evaluation #
    //##################################################

    evaluate_node: function(node, qn) {
        if (!qn)
            qn = connection.ops.quote_name;

        var expressions = [];
        var expression_params = [];
        for each (var child in node.children) {
            if (callable(child['evaluate']))
                var [ sql, params ] = child.evaluate(this, qn);
            else
                var [ sql, params ] = [ '%s', [ child ] ];

            if (len(getattr(child, 'children', [])) > 1)
                var format = '(%s)';
            else
                var format = '%s';

            if (sql) {
                expressions.push(format.subs(sql));
                expression_params = expression_params.concat(params);
            }
        }
        return [ connection.ops.combine_expression(node.connector, expressions), expression_params ];
    },

    evaluate_leaf: function(node, qn) {
        if (!qn)
            qn = connection.ops.quote_name;

        var col = this.cols[node];
        if (callable(col['as_sql']))
            return [ col.as_sql(qn), [] ];
        else
            return [ '%s.%s'.subs(qn(col[0]), qn(col[1])), [] ];
    }
});

publish({
    SQLEvaluator: SQLEvaluator
});