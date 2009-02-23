$L('doff.utils.tree', 'Node');
$L('copy', 'copy', 'deepcopy');

var QueryWrapper = type({
    __init__: function(sql, params){
        this.data = [sql, params];
    }
});

var Q = type('Q', Node, {
    AND: 'AND',
    OR: 'OR',
    default_connector: 'AND',
        __init__: function($super) {
        var [args, kwargs] = Q.prototype.__init__.extra_arguments(arguments);
        //FIXME, con los argumnentos no se me ocurre como salvar esto.
        args = (isarray(args[0]))? args[0] : args;
        $super(args.concat(zip(keys(kwargs), values(kwargs))));
    },

    _combine: function(other, conn){
        if (!other instanceof  Q)
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
    if (!restricted && field.none)
        return false;
    return true;
}

$P({   'QueryWrapper': QueryWrapper,
       'Q':Q,
       'select_related_descend': select_related_descend });