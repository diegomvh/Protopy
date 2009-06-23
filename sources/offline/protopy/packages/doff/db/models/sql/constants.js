publish({
    // Valid query types (a dictionary is used for speedy lookups).
    QUERY_TERMS: {'exact': null, 'iexact': null, 'contains': null, 'icontains': null, 'gt': null,
        'gte': null, 'lt': null, 'lte': null, 'in': null, 'startswith': null, 'istartswith': null,
        'endswith': null, 'iendswith': null, 'range': null, 'year': null, 'month': null, 'day': null,
        'isnull': null, 'search': null, 'regex': null, 'iregex': null },

    // Size of each "chunk" for get_iterator calls.
    // Larger values are slightly faster at the expense of more storage space.
    GET_ITERATOR_CHUNK_SIZE: 100,

    // Separator used to split filter strings apart.
    LOOKUP_SEP: '__',

    // Constants to make looking up tuple values clearer.
    // Join lists (indexes into the tuples that are values in the alias_map
    // dictionary in the Query class).
    TABLE_NAME: 0,
    RHS_ALIAS: 1,
    JOIN_TYPE: 2,
    LHS_ALIAS: 3,
    LHS_JOIN_COL: 4,
    RHS_JOIN_COL: 5,
    NULLABLE: 6,

    // How many results to expect from a cursor.execute call
    MULTI: 'multi',
    SINGLE: 'single',

    ORDER_PATTERN: /\?|[-+]?[.\w]+$/,
    ORDER_DIR: { 'ASC': ['ASC', 'DESC'], 'DESC': ['DESC', 'ASC']}
});