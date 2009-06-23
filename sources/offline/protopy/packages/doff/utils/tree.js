/* 'A class for storing a tree graph. Primarily used for filter constructs in the ORM.' */
require('copy', 'deepcopy')

var Node = type('Node', object, {
    default_connector: "DEFAULT",
    __init__: function(children, connector, negated){
        this.children = children || [];
        this.connector = connector || this.default_connector;
        this.subtree_parents = [];
        this.negated = negated || false;
    },

    //Deep copy
    __deepcopy__: function() {
        var obj = new Node(null, this.connector, this.negated);
        obj.__proto__ = this.constructor.prototype;
        obj.children = deepcopy(this.children);
        obj.subtree_parents = deepcopy(this.subtree_parents);
        return obj;
    },

    __str__: function(){
        var results = [];
        for each (var child in this.children)
            results.push(new String(child));
        if (this.negated) {
            return '(NOT (%s: %s))'.subs(this.connector, results.join(', '));
        }
            return '(%s: %s)'.subs(this.connector, results.join(', '));
    },

    __len__: function(){
        return this.children.length;
    },
    
    __nonzero__: function(){
        return this.children.length != 0;
    },

    __contains__: function(other) {
        return this.children.indexOf(other) > -1;
    },

    get length(){
        return this.__len__();
    },

    //Shallow copy
    copy: function() {
        return this._new_instance(this.children, this.connector, this.negated);
    },

    _new_instance: function(children, connector, negated) {
        var children = children || null;
        var connector = connector || null;
        var negated = negated || false;
        var obj = new Node(children, connector, negated);
        obj.__proto__ = this.constructor.prototype;
        return obj;
    },

    add: function(node, conn_type){
      if (include(this, node) && conn_type == this.connector)
          return;
      if (this.children.length < 2)
          this.connector = conn_type;
      if (this.connector == conn_type) {
          if (isinstance(node, Node) && (node.connector == conn_type || node.length == 1))
            this.children = this.children.concat(node.children);
          else
            this.children.push(node);
      } else {
          var obj = new Node(this.children, this.connector, this.negated);
          this.connector = conn_type;
          this.children = [obj, node];
      }
    },

    negate: function(){
        this.children = [this._new_instance(this.children, this.connector, !this.negated)];
        this.connector = this.default_connector;
    },

    start_subtree: function(conn_type){
        if (this.children.length == 1)
            this.connector = conn_type;
        else if (this.connector != conn_type) {
            this.children = [this._new_instance(this.children, this.connector, this.negated)];
            this.connector = conn_type;
            this.negated = false;
        }

        this.subtree_parents.push(this._new_instance(this.children, this.connector, this.negated))
        this.connector = this.default_connector;
        this.negated = false;
        this.children = [];
    },

    end_subtree: function() {
        var obj = this.subtree_parents.pop();
        var node = this.constructor(this.children, this.connector);
        this.connector = obj.connector;
        this.negated = obj.negated;
        this.children = obj.children;
        this.children.push(node);
    }
});

publish({
    Node: Node
});