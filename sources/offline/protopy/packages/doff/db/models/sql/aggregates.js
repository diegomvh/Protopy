/*
 * Classes to represent the default SQL aggregate functions
 */

/*
 * An internal field mockup used to identify aggregates in the data-conversion parts of the database backend.
 */   
var AggregateField = type('AggregateField', [ object ], {
    __init__: function(internal_type) {
        this.internal_type = internal_type;
    },
    get_internal_type: function() {
        return this.internal_type;
    }
});

var ordinal_aggregate_field = new AggregateField('IntegerField');
var computed_aggregate_field = new AggregateField('FloatField');

/*
 * Default SQL Aggregate.
 */
var Aggregate = type('Aggregate', [ object ], {
    is_ordinal: false,
    is_computed: false,
    sql_template: '%(function)s(%(field)s)',

    __init__: function(col) {
        /*Instantiate an SQL aggregate

         * col is a column reference describing the subject field
           of the aggregate. It can be an alias, or a tuple describing
           a table and column name.
         * source is the underlying field or aggregate definition for
           the column reference. If the aggregate is not an ordinal or
           computed type, this reference is used to determine the coerced
           output type of the aggregate.
         * extra is a dictionary of additional data to provide for the
           aggregate definition

        Also utilizes the class variables:
         * sql_function, the name of the SQL function that implements the
           aggregate.
         * sql_template, a template string that is used to render the
           aggregate into SQL.
         * is_ordinal, a boolean indicating if the output of this aggregate
           is an integer (e.g., a count)
         * is_computed, a boolean indicating if this output of this aggregate
           is a computed float (e.g., an average), regardless of the input
           type.

        */
        var arg = new Arguments(arguments);
        this.col = col
        this.source = arg.kwargs['source'] || null;
        this.is_summary = arg.kwargs['is_summary'] || false;
        this.extra = arg.kwargs;

        // Follow the chain of aggregate sources back until you find an
        // actual field, or an aggregate that forces a particular output
        // type. This type of this field will be used to coerce values
        // retrieved from the database.
        var tmp = this;

        while (tmp && isinstance(tmp, Aggregate)) {
            if (getattr(tmp, 'is_ordinal', false))
                tmp = ordinal_aggregate_field;
            else if (getattr(tmp, 'is_computed', false))
                tmp = computed_aggregate_field;
            else
                tmp = tmp.source;
        }

        this.field = tmp;
    },

    relabel_aliases: function(change_map) {
        if (isinstance(this.col, Array))
            this.col = [ change_map[this.col[0]] || this.col[0], this.col[1] ];
    },

    as_sql: function(quote_func) {
        /*Return the aggregate, rendered as SQL.*/
        if (!quote_func)
            quote_func = function(x) {return x;};

        if (hasattr(this.col, 'as_sql'))
            field_name = this.col.as_sql(quote_func);
        else if (isinstance(this.col, Array))
            field_name = [quote_func(c) for each (c in this.col)].join('.');
        else
            field_name = this.col;

        var params = {
            'function': this.sql_function,
            'field': field_name
        }
        params = extend(params, this.extra);

        return this.sql_template.subs(params);
    }
});

var Avg = type('Avg', [ Aggregate ], {
    is_computed: true,
    sql_function: 'AVG'
});

var Count = type('Count', [ Aggregate ], {
    is_computed: true,
    sql_function: 'COUNT',
    sql_template: '%(function)s(%(distinct)s%(field)s)',
    
    __init__: function(col, distinct) {
        var arg = new Arguments(arguments);
        arg.kwargs['distinct'] = distinct ? 'DISTINCT ' : '';
        super(Aggregate, this).__init__(col, arg.kwargs);
    }
});

var Max = type('Max', [ Aggregate ], {
    sql_function: 'MAX'
});

var Min = type('Min', [ Aggregate ], {
    sql_function: 'MIN'
});

var StdDev = type('StdDev', [ Aggregate ], {
    is_computed: true,
    __init__: function(col, sample) {
        var arg = new Arguments(arguments);
        super(Aggregate, this).__init__(col, arg.kwargs);
        this.sql_function = sample ? 'STDDEV_SAMP' : 'STDDEV_POP';
    }
});

var Sum = type('Sum', [ Aggregate ], {
    sql_function: 'SUM'
});

var Variance = type('Variance', [ Aggregate ], {
    is_computed: true,
    __init__: function(col, sample) {
        var arg = new Arguments(arguments);
        super(Aggregate, this).__init__(col, arg.kwargs);
        this.sql_function = sample? 'VAR_SAMP' : 'VAR_POP';
    }
});

publish({
    AggregateField: AggregateField,
    ordinal_aggregate_field: ordinal_aggregate_field,
    computed_aggregate_field: computed_aggregate_field,
    Aggregate: Aggregate,
    Avg: Avg,
    Count: Count,
    Max: Max,
    Min: Min,
    StdDev: StdDev,
    Sum: Sum,
    Variance: Variance
});