var EmptyResultSet = Class('EmptyResultSet', Exception);
var FullResultSet = Class('FullResultSet', Exception);

/*
    * Used by join construction code to indicate the point at which a
    * multi-valued join was attempted (if the caller wants to treat that
    * exceptionally).
    */
var MultiJoin = Class('MultiJoin', Exception, {
    __init__: function(level) {
        this.level = level;
    }
});

var Empty = Class('Empty');

var RawValue = Class('RawValue', {
    __init__: function(value) {
        this.value = value;
    }
});

/*
    * Base class for all aggregate-related classes (min, max, avg, count, sum).
    */
var Aggregate = Class('Aggregate', {
    /*
        * Relabel the column alias, if necessary. Must be implemented by
        * subclasses.
        */
    relabel_aliases: function(change_map) {
        throw new NotImplementedError();
    },

    /*
        * Returns the SQL string fragment for this object.
        * The quote_func function is used to quote the column components. If
        * None, it defaults to doing nothing.
        * Must be implemented by subclasses.
        */
    as_sql: function(quote_func) {
        throw new NotImplementedError();
    }
});

/*
    * Perform a count on the given column.
    */
var Count = Class('Count', Aggregate, {

    /*
        * Set the column to count on (defaults to '*') and set whether the count
        * should be distinct or not.
        */
    __init__: function(col, distinct){
        this.col = col || '*';
        this.distinct = distinct || false;
    },
    
    relabel_aliases: function(change_map){
        var c = this.col;
        if (isarray(c))
            this.col = [change_map.get(c[0], c[0]), c[1]];
    },

    as_sql: function(quote_func) {
        if (isundefined(quote_func))
            quote_func = function (x) {return x};
        if (isarray(this.col))
            col = ['%s.%s'.subs([quote_func(c) for (c in this.col)])];
        else if (this.col['as_sql'])
            col = this.col.as_sql(quote_func);
        else
            col = this.col;
        if (this.distinct)
            return 'COUNT(DISTINCT %s)'.subs(col);
        else
            return 'COUNT(%s)'.subs(col);
    }
});

/*
    * Add a date selection column.
    */
var Date = Class('Date', {

    __init__: function(col, lookup_type, date_sql_func){
        this.col = col;
        this.lookup_type = lookup_type;
        this.date_sql_func = date_sql_func;
    },

    relabel_aliases: function(change_map){
        var c = this.col;
        if (isarray(c))
            this.col = [change_map.get(c[0], c[0]), c[1]];
    },

    as_sql: function(quote_func) {
        if (isundefined(quote_func))
            quote_func = function (x) {return x};
        if (isarray(this.col))
            col = ['%s.%s'.subs([quote_func(c) for (c in this.col)])];
        else if (this.col['as_sql'])
            col = this.col.as_sql(quote_func);
        else
            col = this.col;
        return this.date_sql_func(this.lookup_type, col);
    }
});

$P({
    'EmptyResultSet': EmptyResultSet,
    'FullResultSet': FullResultSet,
    'MultiJoin': MultiJoin,
    'Empty': Empty,
    'RawValue': RawValue,
    'Aggregate': Aggregate,
    'Count': Count,
    'Date': Date
});
