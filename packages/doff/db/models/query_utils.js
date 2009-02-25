$L('doff.utils.tree', 'Node');
$L('copy', 'copy', 'deepcopy');

var QueryWrapper = type({
    '__init__': function __init__(sql, params){
        this.data = [sql, params];
    }
});

var Q = type('Q', Node, {
    AND: 'AND',
    OR: 'OR',
    default_connector: 'AND',

    '__init__': function __init__() {
        arguments = new Arguments(arguments);
        super(Node, this).__init__(arguments.args.concat(zip(keys(arguments.kwargs), values(arguments.kwargs))));
    },

    '_combine': function _combine(other, conn){
        if (!isinstance(other, Q))
            throw new TypeError(other);
        var obj = deepcopy(this);
        obj.add(other, conn);
        return obj;
    },

    //I whish __or__ , but
    'or': function or(other){
        return this._combine(other, this.OR);
    },
    
    //I whish __and__ , but
    'and': function and(other){
        return this._combine(other, this.AND);
    },
    
    //I whish __invert__ , but
    'invert': function invert(){
        var obj = deepcopy(this);
        obj.negate();
        return obj;
    }
});

function select_related_descend(field, restricted, requested) {
    if (!field.rel)
        return false;
    if (!field.rel.parent_link)
        return false;
    //TODO: ver como se resuleve el in
    if (restricted && !(field.name in requested))
        return false;
    if (!restricted && field.none)
        return false;
    return true;
}

$P({   'QueryWrapper': QueryWrapper,
       'Q':Q,
       'select_related_descend': select_related_descend });