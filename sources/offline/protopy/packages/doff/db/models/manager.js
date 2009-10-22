/* "doff.db.models.manager" */
require('doff.db.models.query', 'QuerySet', 'EmptyQuerySet', 'insert_query');
require('event');
require('doff.db.models.fields.base', 'FieldDoesNotExist');
require('copy', 'copy');

function ensure_default_manager(cls) {
    if (!cls['_default_manager'] && !cls._meta['abstract']) {
        try {
            var f = cls._meta.get_field('objects');
            throw new ValueError("Model %s must specify a custom Manager, because it has a field named 'objects'".subs(cls.name));
        } catch (e if e instanceof FieldDoesNotExist) {}
        cls.add_to_class('objects', new Manager());
    }
};

var hcp = event.subscribe('class_prepared', ensure_default_manager);

var Manager = type('Manager', [ object ], {
    creation_counter: 0
},{
    __init__: function() {
        this._set_creation_counter();
        this.model = null;
        this._inherited = false;
    },

    contribute_to_class: function(model, name){
        this.model = model;
        var md = new ManagerDescriptor(this);
        model.__defineGetter__(name, function(){ return md.__get__(this, this.constructor); });
        if (!model['_default_manager'] || this.creation_counter < model._default_manager.creation_counter)
            model._default_manager = this;
        if (model._meta['abstract'] || this._inherited)
            model._meta.abstract_managers.push([this.creation_counter, name, this]);
    },

    _set_creation_counter: function() {
        this.creation_counter = Manager.creation_counter;
        Manager.creation_counter += 1;
    },

    _copy_to_model: function(model){
        assert(issubclass(model, this.model));
        var mgr = copy(this);
        mgr._set_creation_counter();
        mgr.model = model;
        mgr._inherited = true;
        return mgr;
    },

    // PROXIES TO QUERYSET

    get_empty_query_set: function(){
        return new EmptyQuerySet(this.model);
    },

    get_query_set: function(){
        return new QuerySet(this.model);
    },

    empty: function() {
        return this.get_empty_query_set();
    },

    all: function() {
        return this.get_query_set();
    },

    count: function() {
        return this.get_query_set().count();
    },

    dates: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.dates.apply(qs, arg.argskwargs);
    },
    
    distinct: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.distinct.apply(qs, arg.argskwargs);
    },

    extra: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.extra.apply(qs, arg.argskwargs);
    },

    get: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.get.apply(qs, arg.argskwargs);
    },

    get_or_create: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.get_or_create.apply(qs, arg.argskwargs);
    },

    create: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.create.apply(qs, arg.argskwargs);
    },

    filter: function(){
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.filter.apply(qs, arg.argskwargs);
    },

    complex_filter: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.complex_filter.apply(qs, arg.argskwargs);
    },

    exclude: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.exclude.apply(qs, arg.argskwargs);
    },

    in_bulk: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.in_bulk.apply(qs, arg.argskwargs);
    },

    iterator: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.iterator.apply(qs, arg.argskwargs);
    },

    latest: function(field_name) {
        var qs = this.get_query_set();
        return qs.latest.apply(qs, arguments);
    },

    order_by: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.order_by.apply(qs, arg.argskwargs);
    },

    select_related: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.select_related.apply(qs, arg.argskwargs);
    },

    values: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.values.apply(qs, arg.argskwargs);
    },

    values_list: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.values_list.apply(qs, arg.argskwargs);
    },

    update: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.update.apply(qs, arg.argskwargs);
    },

    reverse: function() {
        var arg = new Arguments(arguments);
        var qs = this.get_query_set();
        return qs.reverse.apply(qs, arg.argskwargs);
    },

    _insert: function(values) {
        var arg = new Arguments(arguments);
        return insert_query(this.model, values, arg.kwargs['return_id'], arg.kwargs['raw_values']);
    },

    _update: function(values) {
        var arg = new Arguments(arguments);
        args.push(kwargs);
        var qs = this.get_query_set();
        return qs._update.apply(qs, args);
    }
});

var ManagerDescriptor = type('ManagerDescriptor', [ object ], {
    __init__: function(manager) {
        this.manager = manager;
    },

    __get__: function(instance, type) {
        if (!isinstance(instance, type))
            throw new AttributeError("Manager isn't accessible via %s instances".subs(type.__name__));
        return this.manager;
    }
});

var EmptyManager = type('EmptyManager', [ Manager ], {
    get_query_set: function() {
        return this.get_empty_query_set();
    }
});

publish({
    Manager: Manager,
    ManagerDescriptor: ManagerDescriptor,
    EmptyManager: EmptyManager  
});