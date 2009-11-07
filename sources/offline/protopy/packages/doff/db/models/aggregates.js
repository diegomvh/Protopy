/*
 * Classes to represent the definitions of aggregate functions.
 */

/*
 * Default Aggregate definition.
 */
var Aggregate = type('Aggregate', [ object ], {
    __init__: function(lookup) {
        /*Instantiate a new aggregate.

         * lookup is the field on which the aggregate operates.
         * extra is a dictionary of additional data to provide for the
           aggregate definition

        Also utilizes the class variables:
         * name, the identifier for this aggregate function.
        */
        var arg = new Arguments(arguments);
        this.lookup = lookup;
        this.extra = arg.kwargs;
    },

    get default_alias() {
        return '%s__%s'.subs(this.lookup, this.name.toLowerCase());
    },

    add_to_query: function(query, alias, col, source, is_summary) {
        /*Add the aggregate to the nominated query.

        This method is used to convert the generic Aggregate definition into a
        backend-specific definition.

         * query is the backend-specific query instance to which the aggregate
           is to be added.
         * col is a column reference describing the subject field
           of the aggregate. It can be an alias, or a tuple describing
           a table and column name.
         * source is the underlying field or aggregate definition for
           the column reference. If the aggregate is not an ordinal or
           computed type, this reference is used to determine the coerced
           output type of the aggregate.
         * is_summary is a boolean that is set True if the aggregate is a
           summary value rather than an annotation.
        */
        var klass = getattr(query.aggregates_module, this.name);
        var aggregate = new klass(col, source, is_summary, this.extra);
        // Validate that the backend has a fully supported, correct
        // implementation of this aggregate
        query.connection.ops.check_aggregate_support(aggregate);
        query.aggregates[alias] = aggregate;
    }
});

var Avg = type('Avg', [ Aggregate ], {
    name: 'Avg'
});

var Count = type('Count', [ Aggregate ], {
    name: 'Count'
});

var Max = type('Max', [ Aggregate ], {
    name: 'Max'
});

var Min = type('Min', [ Aggregate ], {
    name: 'Min'
});

var StdDev = type('StdDev', [ Aggregate ], {
    name: 'StdDev'
});

var Sum = type('Sum', [ Aggregate ], {
    name: 'Sum'
});

var Variance = type('Variance', [ Aggregate ], {
    name: 'Variance'
});

publish({
    Aggregate: Aggregate,
    Avg: Avg,
    Count: Count,
    Max: Max,
    Min: Min,
    StdDev: StdDev,
    Sum: Sum,
    Variance: Variance
});