$D("doff.db.models.manager");
    
$L('doff.db.models.query', 'QuerySet', 'EmptyQuerySet', 'insert_query');
$L('doff.db.models.signals');
$L('doff.db.models.fields', 'FieldDoesNotExist');
    	
function ensure_default_manager(payload) {
    var cls = payload['sender'];
    if (!cls['_default_manager'] && !cls._meta.abstracto) {
        try {
            var f = cls._meta.get_field('objects');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if e instanceof FieldDoesNotExist) {}
        cls.add_to_class('objects', new Manager());
    }
};

signals.class_prepared.connect(ensure_default_manager);

var Manager = type('Manager', {
        '__init__': function __init__(){
        this._set_creation_counter();
        this.model = null;
        this._inherited = false;
    },

    'contribute_to_class': function contribute_to_class(model, name){
        this.model = model;
        var md = new ManagerDescriptor(this);
        model.__defineGetter__(name, function(){ return md.__get__(this, this.constructor); });
            if (!model['_default_manager'] || this.creation_counter < model._default_manager.creation_counter)
            model._default_manager = this;
        if (model._meta.abstracto || this._inherited)
            model._meta.abstract_managers.push([this.creation_counter, name, this]);
        },

    '_set_creation_counter': function _set_creation_counter(){
        this.creation_counter = Manager.creation_counter;
        Manager.creation_counter += 1;
    },

    '_copy_to_model': function _copy_to_model(model){
        //assert issubclass(model, this.model)
        //TODO: Hacer un assert en javascript
        var mgr = copy.copy(this);
        mgr._set_creation_counter();
        mgr.model = model;
        mgr._inherited = true;
        return mgr;
    },

    // PROXIES TO QUERYSET

    'get_empty_query_set': function get_empty_query_set(){
        return new EmptyQuerySet(this.model);
    },

    'get_query_set': function get_query_set(){
        return new QuerySet(this.model);
    },

    'empty': function empty() {
        return this.get_empty_query_set();
    },

    'all': function all() {
        return this.get_query_set();
    },

    'count': function count() {
        return this.get_query_set().count();
    },

    'dates': function dates(){
        var [args, kwargs] = Manager.prototype.dates.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.dates.apply(qs, args);
    },
    
    'distinct': function distinct(){
        var [args, kwargs] = Manager.prototype.distinct.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.distinct.apply(qs, args);
    },

    'extra': function extra(){
        var [args, kwargs] = Manager.prototype.extra.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.extra.apply(qs, args);
    },

    'get': function get(){
        var [args, kwargs] = Manager.prototype.get.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.get.apply(qs, args);
    },

    'get_or_create': function get_or_create(){
        var [args, kwargs] = Manager.prototype.get_or_create.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.get_or_create.apply(qs, args);
    },

    'create': function create(){
        var [args, kwargs] = Manager.prototype.create.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.create.apply(qs, args);
    },

    'filter': function filter(){
        var [args, kwargs] = Manager.prototype.filter.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.filter.apply(qs, args);
    },

    'complex_filter': function complex_filter(){
        var [args, kwargs] = Manager.prototype.complex_filter.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.complex_filter.apply(qs, args);
    },

    'exclude': function exclude(){
        var [args, kwargs] = Manager.prototype.exclude.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.exclude.apply(qs, args);
    },

    'in_bulk': function in_bulk(){
        var [args, kwargs] = Manager.prototype.in_bulk.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.in_bulk.apply(qs, args);
    },

    'iterator': function iterator(){
        var [args, kwargs] = Manager.prototype.iterator.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.iterator.apply(qs, args);
    },

    'latest': function latest(){
        var [args, kwargs] = Manager.prototype.latest.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.latest.apply(qs, args);
    },

    'order_by': function order_by(){
        var [args, kwargs] = Manager.prototype.order_by.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.order_by.apply(qs, args);
    },

    'select_related': function select_related(){
        var [args, kwargs] = Manager.prototype.select_related.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.select_related.apply(qs, args);
    },

    'values': function values(){
        var [args, kwargs] = Manager.prototype.values.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.values.apply(qs, args);
    },

    'values_list': function values_list() {
        var [args, kwargs] = Manager.prototype.values_list.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.values_list.apply(qs, args);
    },
    
    'update': function update() {
        var [args, kwargs] = Manager.prototype.update.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.update.apply(qs, args);
    },

    'reverse': function reverse(){
        var [args, kwargs] = Manager.prototype.reverse.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs.reverse.apply(qs, args);
    },

    '_insert': function _insert(values) {
        var [args, kwargs] = Manager.prototype._insert.extra_arguments(arguments);
        args.push(kwargs);
        return insert_query(this.model, values, kwargs['return_id'], kwargs['raw_values']);
    },

    '_update': function _update(values){
        var [args, kwargs] = Manager.prototype._update.extra_arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs._update.apply(qs, args);
    }
    });
Manager.creation_counter = 0;

var ManagerDescriptor = type('ManagerDescriptor', {
    '__init__': function __init__(manager){
        this.manager = manager;
    },
    
    '__get__': function __get__(instance, type){
        if (!isclass(instance))
            throw new AttributeError("Manager isn't accessible via %s instances".subs(type.__name__));
        return this.manager;
    }
});

var EmptyManager = type('EmptyManager', Manager, {
    'get_query_set': function get_query_set(){
        return this.get_empty_query_set();
    }
});

$P({    'Manager': Manager,
        'ManagerDescriptor': ManagerDescriptor,
        'EmptyManager': EmptyManager  });