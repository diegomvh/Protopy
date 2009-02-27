$D("doff.utils.datastructures");
$L('copy', 'copy');
var SortedDict = type('SortedDict', Dict, {
    '__init__': function __init__(object) {
        super(Dict, this).__init__(object);
        this.keyOrder = (object instanceof SortedDict)? copy(object.keyOrder) : values(this._key);
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