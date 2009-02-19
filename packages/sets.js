$D('sets');

var Set = Class('Set', {
    __init__: function(elements){
        var elements = elements || [];
        if (!isarray(elements))
            throw new TypeError(elements + ' object is not array');
        this.elements = unique(elements);
        this.__defineGetter__('length', function(){ return this.elements.length});
    },

    __contains__: function(element){
        return include(this.elements, element);
    },

    __nonzero__: function(){
        return bool(this.elements);
    },

    __len__: function() {
        return len(this.elements);
    },

    __eq__: function(set) {
        return true;
    },

    __ne__: function(set) {
        return true;
    },

    __copy__: function(){
        return this.copy();
    },

    __deepcopy__: function(){
        return new Set(this.elements.__deepcopy__());
    },

    __iter__: function() {
        for each (var element in this.elements)
    	    yield element;
    },

    add: function(element) {
      if (!include(this.elements, element))
          this.elements.push(element);
    },

    remove: function(element){
      var index = this.elements.indexOf(element);
      if (index == -1)
          throw new KeyError(element);
      return this.elements.splice(index, 1)[0];
    },

    discard: function(element){
      try {
          return this.remove(element);
      } catch (e if e instanceof KeyError) {
          return null;
      }
    },

    pop:  function(){
        return this.elements.pop();
    },

    update:  function(set){
        var elements = isarray(set)? set : set.elements;
        this.elements = unique(this.elements.concat(elements));
    },

    union:  function(set){
        var elements = isarray(set)? set : set.elements;
        return new Set(this.elements.concat(elements));
    },

    intersection: function(set){
        return new Set(this.elements.filter(function(e) { return include(set, e); }));
    },

    intersection_update:  function(set){
        this.elements = this.elements.filter(function(e) { return include(set, e); });
    },

    issubset: function(set){
        if (this.length > set.length) return false;
        return this.elements.map(function(e){ return include(set, e) }).every(function(x){ return x });
    },

    issuperset: function(set){
        if (this.length < set.length) return false;
        return set.elements.map(function(e){ return include(this, e) }, this).every(function(x){ return x });
    },

    clear: function(){
        return this.elements.clear();
    },

    copy: function(){
        return new Set(this.elements);
    },

    difference:  function(set){
        return new Set(this.elements.filter(function(e) { return !include(set, e); }));
    },

    difference_update:  function(set){
        this.elements = this.elements.filter(function(e) { return !include(set, e); });
    },

    symmetric_difference:  function(set){
        var set = this.difference(set);
        return set.difference(this);
    },

    symmetric_difference_update:  function(set){
        var set = this.difference(set);
        this.elements = set.difference(this).elements;
    }
});

$P({'Set': Set});