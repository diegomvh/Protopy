$D("doff.utils.datastructures");

var SortedDict = Class('SortedDict', Dict, {
    __init__: function($super, object){
        $super(object);
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

    set: function($super, key, value) {
        this.keyOrder.push(key);
        return $super(key, value);
    },

    unset: function($super, key) {
        this.keyOrder.without(key);
        return $super(key);
    },

    /* 
        * Returns the value of the item at the given zero-based index.
        */
    value_for_index: function(index) {
        return this.get(this.keyOrder[index]);
    }
});

$P({ 'SortedDict': SortedDict });