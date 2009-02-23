$D("doff.utils.datastructures");

var SortedDict = type('SortedDict', Dict, {
    __init__: function(object){
        super(Dict, this).__init__(object);
        this.keyOrder = values(this._key);
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

    set: function(key, value) {
        this.keyOrder.push(key);
        return super(Dict, this).set(key, value);
    },

    unset: function(key) {
        this.keyOrder.without(key);
        return super(Dict, this).unset(key);
    },

    /* 
        * Returns the value of the item at the given zero-based index.
        */
    value_for_index: function(index) {
        return this.get(this.keyOrder[index]);
    }
});

$P({ 'SortedDict': SortedDict });