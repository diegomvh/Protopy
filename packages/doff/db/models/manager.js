$D("doff.db.models.manager");
$L('doff.db.models.query', 'QuerySet', 'EmptyQuerySet', 'insert_query');
$L('event');
$L('doff.db.models.fields', 'FieldDoesNotExist');
$L('copy', 'copy');

function ensure_default_manager(cls) {
    if (!cls['_default_manager'] && !cls._meta.abstracto) {
        try {
            var f = cls._meta.get_field('objects');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if e instanceof FieldDoesNotExist) {}
        cls.add_to_class('objects', new Manager());
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_manager);

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
        var mgr = copy(this);
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
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.dates.apply(qs, arguments.argskwargs);
    },
    
    'distinct': function distinct(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.distinct.apply(qs, arguments.argskwargs);
    },

    'extra': function extra(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.extra.apply(qs, arguments.argskwargs);
    },

    'get': function get(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.get.apply(qs, arguments.argskwargs);
    },

    'get_or_create': function get_or_create(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.get_or_create.apply(qs, arguments.argskwargs);
    },

    'create': function create(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.create.apply(qs, arguments.argskwargs);
    },

    'filter': function filter(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.filter.apply(qs, arguments.argskwargs);
    },

    'complex_filter': function complex_filter(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.complex_filter.apply(qs, arguments.argskwargs);
    },

    'exclude': function exclude(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.exclude.apply(qs, arguments.argskwargs);
    },

    'in_bulk': function in_bulk(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.in_bulk.apply(qs, arguments.argskwargs);
    },

    'iterator': function iterator(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.iterator.apply(qs, arguments.argskwargs);
    },

    'latest': function latest(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.latest.apply(qs, arguments.argskwargs);
    },

    'order_by': function order_by(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.order_by.apply(qs, arguments.argskwargs);
    },

    'select_related': function select_related(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.select_related.apply(qs, arguments.argskwargs);
    },

    'values': function values(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.values.apply(qs, arguments.argskwargs);
    },

    'values_list': function values_list() {
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.values_list.apply(qs, arguments.argskwargs);
    },
    
    'update': function update() {
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.update.apply(qs, arguments.argskwargs);
    },

    'reverse': function reverse(){
        arguments = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.reverse.apply(qs, arguments.argskwargs);
    },

    '_insert': function _insert(values) {
        arguments = new Arguments(arguments);
        return insert_query(this.model, values, arguments.kwargs['return_id'], arguments.kwargs['raw_values']);
    },

    '_update': function _update(values){
        arguments = new Arguments(arguments);
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
        if (!isinstance(instance, type))
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