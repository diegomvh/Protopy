require('doff.utils.tree', 'Node');
require('copy', 'copy', 'deepcopy');

var QueryWrapper = type('QueryWrapper', [ object ], {
    __init__: function(sql, params){
        this.data = [sql, params];
    }
});

var Q = type('Q', [ Node ], {
    AND: 'AND',
    OR: 'OR',
    default_connector: 'AND',

    __init__: function() {
        var arg = new Arguments(arguments);
        var args = (arg.args && arg.args[0] && isinstance(arg.args[0], Array))? arg.args[0] : arg.args;
        super(Node, this).__init__(args.concat(zip(keys(arg.kwargs), values(arg.kwargs))));
    },

    _combine: function(other, conn){
        if (!isinstance(other, Q))
            throw new TypeError(other);
        var obj = deepcopy(this);
        obj.add(other, conn);
        return obj;
    },

    //I whish __or__ , but
    or: function(other){
        return this._combine(other, this.OR);
    },
    
    //I whish __and__ , but
    and: function(other){
        return this._combine(other, this.AND);
    },
    
    //I whish __invert__ , but
    invert: function(){
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
    if (!restricted && field['null'])
        return false;
    return true;
}

publish({   
    QueryWrapper: QueryWrapper,
    Q:Q,
    select_related_descend: select_related_descend 
});