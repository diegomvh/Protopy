/* 'doff.utils.datastructures' */
require('copy', 'copy', 'deepcopy');

var SortedDict = type('SortedDict', Dict, {
    __init__: function(object) {
        this.keyOrder = (object && isinstance(object, SortedDict))? copy(object.keyOrder) : [];
        super(Dict, this).__init__(object);
    },

    __str__: function() {
        var n = len(this.keyOrder);
        return "%s".times(n, ', ').subs(this.keyOrder);
    },

    __iter__: function() {
        for each (var key in this.keyOrder) {
            var value = this.get(key);
            var pair = [key, value];
            pair.key = key;
            pair.value = value;
            yield pair;
        }
    },

    __copy__: function() {
        return new SortedDict(this);
    },

    __deepcopy__: function() {
        var obj = new SortedDict();
        for (var hash in this._key) {
            obj._key[hash] = deepcopy(this._key[hash]);
            obj._value[hash] = deepcopy(this._value[hash]);
        }
        obj.keyOrder = deepcopy(this.keyOrder); 
        return obj;
    },

    set: function(key, value) {
        this.keyOrder.push(key);
        return super(Dict, this).set(key, value);
    },

    unset: function(key) {
        without(this.keyOrder, key);
        return super(Dict, this).unset(key);
    },

     /* 
      * Returns the value of the item at the given zero-based index.
      */
    value_for_index: function(index) {
        return this.get(this.keyOrder[index]);
    }
});

publish({ 
    SortedDict: SortedDict 
});