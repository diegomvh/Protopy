/* 'doff.utils.datastructures' */
$L('copy', 'copy', 'deepcopy');

var SortedDict = type('SortedDict', Dict, {
    '__init__': function __init__(object) {
        this.keyOrder = (object && isinstance(object, SortedDict))? copy(object.keyOrder) : [];
        super(Dict, this).__init__(object);
    },
    
    '__iter__': function __iter__() {
        for each (var key in this.keyOrder) {
            var value = this.get(key);
            var pair = [key, value];
            pair.key = key;
            pair.value = value;
            yield pair;
        }
    },

    '__copy__': function __copy__() {
        return new SortedDict(this);
    },
    
    '__deepcopy__': function __copy__() {
        var obj = new SortedDict();
        for (hash in this._key) {
            obj._key[hash] = deepcopy(this._key[hash]);
            obj._value[hash] = deepcopy(this._value[hash]);
        }
        obj.keyOrder = deepcopy(this.keyOrder); 
        return obj;
    },

    'set': function set(key, value) {
        this.keyOrder.push(key);
        return super(Dict, this).set(key, value);
    },

    'unset': function unset(key) {
        this.keyOrder.without(key);
        return super(Dict, this).unset(key);
    },

     /* 
      * Returns the value of the item at the given zero-based index.
      */
    'value_for_index': function value_for_index(index) {
        return this.get(this.keyOrder[index]);
    }
});

$P({ 'SortedDict': SortedDict });