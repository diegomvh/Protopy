$D("doff.db.models.fields.related");
$L('doff.db', 'connection');
$L('doff.db.models.signals');
$L('doff.db.models.loading', 'get_model');
$L('doff.db.models.fields', 'AutoField', 'Field', 'IntegerField', 'PositiveIntegerField', 'PositiveSmallIntegerField', 'FieldDoesNotExist');
$L('doff.db.models.related', 'RelatedObject');
$L('doff.db.models.query', 'QuerySet');
$L('doff.db.models.query_utils', 'QueryWrapper');
$L('doff.core.exceptions', 'ValidationError');

var RECURSIVE_RELATIONSHIP_CONSTANT = 'this';
var pending_lookups = {};

function add_lazy_relation(cls, field, relation, operation){
    var app_label = null, model_name = null, model = null;

    if (relation == RECURSIVE_RELATIONSHIP_CONSTANT) {
	app_label = cls._meta.app_label;
	model_name = cls.__name__;
    } else {
	//Look for an "app.Model" relation
	[app_label, model_name] = relation.split(".");
	if (!model_name) {
	    app_label = cls._meta.app_label;
	    model_name = relation;
	}
    }
    model = get_model(app_label, model_name, false);
    if (model)
	operation(field, model, cls);
    else {
	var key = app_label + model_name;
	var value = [cls, field, operation];
	if (isundefined(pending_lookups[key]))
	    pending_lookups[key] = [];
	pending_lookups[key].push(value);
    }
}

function do_pending_lookups(payload) {
    var key = payload['sender']._meta.app_label + payload['sender'].__name__;
    for each (var value in pending_lookups[key]) {
	var [cls, field, operation] = value;
	operation(field, sender, cls);
    };
    delete pending_lookups[key];
}

signals.class_prepared.connect(do_pending_lookups);

var RelatedField = Class('RelatedField', Field, {
    contribute_to_class: function($super, cls, name) {
	$super(cls, name);
	
	this.related_query_name = this._get_related_query_name.curry(cls._meta);
		    
	if ((!cls._meta.abstracto) && (this.rel.related_name))
	    this.rel.related_name = this.rel.related_name.interpolate({'class': cls.__name__.toLowerCase()});

	var other = this.rel.to;

	if (isstring(other)) {
	    function resolve_related_class(field, model, cls){
		field.rel.to = model;
		field.do_related_class(model, cls);
	    }
	    add_lazy_relation(cls, this, other, resolve_related_class);
	} else {
	    this.do_related_class(other, cls);
	}
    },

    set_attributes_from_rel: function(){
	this.name = this.name || (this.rel.to._meta.object_name.toLowerCase() + '_' + this.rel.to._meta.pk.name);
	if (!this.verbose_name)
	    this.verbose_name = this.rel.to._meta.verbose_name;
	this.rel.field_name = this.rel.field_name || this.rel.to._meta.pk.name;
    },
    
    do_related_class: function(other, cls) {
	this.set_attributes_from_rel();
	var related = new RelatedObject(other, cls, this);
	if (!cls._meta.abstracto)
	    this.contribute_to_related_class(other, related);
    },

    get_db_prep_lookup: function(lookup_type, value) {
	function pk_trace(val) {
	    var v = val, field = null;
	    while (v) {
		v = v[v._meta.pk.name];
		field = v._meta.pk;
	    }
	    if (field) {
		if (include(['range', 'in'], lookup_type))
		    v = [v];
		v = field.get_db_prep_lookup(lookup_type, v);
		if (isarray(v))
		    v = v[0];
	    }
	    return v;
	};

	if (!isundefined(value['as_sql'])) {
	    var [sql, params] = value.as_sql();
	    return new QueryWrapper(['(%s)'.subs(sql)], params);
	}

	if (include(['exact', 'gt', 'lt'], lookup_type))
	    return [pk_trace(value)];
	if (include(['range', 'in'], lookup_type))
	    return value.map(pk_trace);
	else if (lookup_type == 'isnull')
	    return [];
	throw new TypeError("Related Field has invalid lookup: %s".subs(lookup_type));
    },

    _get_related_query_name: function(opts) {
	return this.rel.related_name || opts.object_name.toLowerCase();
    }
    });

var SingleRelatedObjectDescriptor = Class('SingleRelatedObjectDescriptor', {
    __init__: function(related){
	this.related = related;
	this.cache_name = '_%s_cache'.subs(related.get_accessor_name());
    },

    __get__: function(instance, instance_type) {
	if (!isinstance(instance))
	    throw new AttributeError("%s must be accessed via instance".subs(this.related.opts.object_name));

	var ret = instance[this.cache_name];
	if (!ret) {
	    var key = '%s__pk'.subs(this.related.field.name);
	    var params = {};
	    params[key] = instance._get_pk_val();
	    rel_obj = this.related.model._default_manager.get(params);
	    instance[this.cache_name] = rel_obj;
	    return rel_obj;
	}
	return ret;
    },

    __set__: function(instance, value) {
	if (!isinstance(instance))
	    throw new AttributeError("%s must be accessed via instance".subs(this.related.opts.object_name));

	if ((!value) && this.related.field.none == false)
	    throw new ValueError('Cannot assign None: "%s.%s" does not allow null values.'.subs(instance._meta.object_name, this.related.get_accessor_name()));
	else if (value && !(value instanceof this.related.model))
	    throw new ValueError('Cannot assign "%r": "%s.%s" must be a "%s" instance.'.subs(value, instance._meta.object_name, this.related.get_accessor_name(), this.related.opts.object_name))

	var key = this.related.field.rel.get_related_field();
	key = key.attname;
	value[key] = instance;

	instance[this.cache_name] = value;
	key = this.related.field.get_cache_name();
	value[key] = instance;
    }
});

var ReverseSingleRelatedObjectDescriptor = Class('ReverseSingleRelatedObjectDescriptor', {
    __init__: function(field_with_rel) {
	this.field = field_with_rel;
    },

    __get__: function(instance, instance_type) {
	if (!isinstance(instance))
	    throw new AttributeError("%s must be accessed via instance".subs(this.field.name));
	var cache_name = this.field.get_cache_name();

	var ret = instance[cache_name];
	if (!ret) {
	    var val = instance[this.field.attname];
	    if (!val) {
		if (this.field.none)
		    return null;
		throw new this.field.rel.to.DoesNotExist(this.field.attname);
	    }
	    var other_field = this.field.rel.get_related_field();
	    var key = null;
        if (other_field.rel)
            key = '%s__pk'.subs(this.field.rel.field_name);
	    else
            key = '%s__exact'.subs(this.field.rel.field_name);
	    var params = {};
	    params[key] = val;
	    var rel_mgr = this.field.rel.to._default_manager;
	    var rel_obj = null;
        if (!isundefined(rel_mgr['use_for_related_fields']))
            rel_obj = rel_mgr.get(params);
	    else
            rel_obj = new QuerySet(this.field.rel.to).get(params);
	    instance[cache_name] = rel_obj;
	    return rel_obj;
	}
	return ret;
    },
    
    __set__: function(instance, value) {
	if (!isinstance(instance))
	    throw new AttributeError("%s must be accessed via instance".subs(this.field.name));

	if (!value && this.field.none == false)
	    throw new ValueError('Cannot assign None: "%s.%s" does not allow null values.'.subs(instance._meta.object_name, this.field.name));
	else if (value && !(value instanceof this.field.rel.to))
	    throw new ValueError('Cannot assign "%s": "%s.%s" must be a "%s" instance.'.subs(value, instance._meta.object_name, this.field.name, this.field.rel.to._meta.object_name));

	var key = this.field.rel.get_related_field();
	key = key.attname;
	var val = value[key] || null;

	instance[this.field.attname] = val;
	key = this.field.get_cache_name()
	instance[key] = value;
    }
});

var ForeignRelatedObjectsDescriptor = Class('ForeignRelatedObjectsDescriptor', {

    __init__: function(related){
	this.related = related;
    },

    __get__: function(instance, instance_type) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	rel_field = this.related.field;
	rel_model = this.related.model;
	superclass = this.related.model._default_manager.constructor;

	var RelatedManager = Class('RelatedManager', superclass, {
	    get_query_set: function($super){
            return $super().filter(this.core_filters);
	    },

	    add: function(objs){
            for each (var obj in objs) {
                obj[rel_field.name] = instance;
                obj.save();
            }
	    },

	    create: function($super, kwargs) {
            var key = rel_field.name;
            kwargs[key] = instance;
            return $super(kwargs);
	    },

	    get_or_create: function($super, kwargs) {
            var key = rel_field.name;
            kwargs[key] = instance;
            return $super(kwargs);
	    }
	});
    RelatedManager.prototype.add.alters_data = true;
	RelatedManager.prototype.create.alters_data = true;
	RelatedManager.prototype.get_or_create.alters_data = true; 

	if (rel_field.none) {
	    RelatedManager.add_methods({
		remove: function(objs) {
                    var key = rel_field.rel.get_related_field().attname;
		    var val = instance[key];
		    for each (var obj in objs) {
			if (obj[rel_field.attname] == val){
			    obj[rel_field.name] = null;
			    obj.save();
			}
			else{
			    throw new rel_field.rel.to.DoesNotExist("%s is not related to %r.".subs(obj, instance));
			}
		    }
		},

		clear: function() {
		    for (obj in this.all()) {
			obj[rel_field.name] = null;
			obj.save();
		    }
		}
	    });
        RelatedManager.prototype.remove.alters_data = true
	    RelatedManager.prototype.clear.alters_data = true;
	}

	manager = new RelatedManager();
	attname = rel_field.rel.get_related_field().name;
	var key = '%s__%s'.subs(rel_field.name, attname);
	manager.core_filters = {},
	manager.core_filters[key] = instance[attname];
	manager.model = this.related.model;

	return manager;
    },

    __set__: function(instance, value) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	var manager = this.__get__(instance);
	if (this.related.field.none)
	    manager.clear();
	manager.add(value);
    }
});

/*
    * Creates a manager that subclasses 'superclass' (which is a Manager)
    * and adds behavior for many-to-many related objects.
    */
function create_many_related_manager(superclass, through) {
    through = through || false;
    var ManyRelatedManager = Class('ManyRelatedManager', superclass, {
	__init__: function($super, model, core_filters, instance, symmetrical, join_table, source_col_name, target_col_name) {
	    $super();
	    this.core_filters = core_filters || null;
	    this.model = model || null;
	    this.symmetrical = symmetrical || null;
	    this.instance = instance || null;
	    this.join_table = join_table || null;
	    this.source_col_name = source_col_name || null;
	    this.target_col_name = target_col_name || null;
	    this.through = through || null;
	    this._pk_val = this.instance._get_pk_val()
	    if (!this._pk_val)
		throw new ValueError("%s instance needs to have a primary key value before a many-to-many relationship can be used." .subs(instance.constructor.__name__));
	},

	get_query_set: function() {
	    return superclass.get_query_set(this)._next_is_sticky().filter.apply(this, this.core_filters);
	},

	clear: function() {
	    this._clear_items(this.source_col_name);
	    // If this is a symmetrical m2m relation to self, clear the mirror entry in the m2m table
	    if (this.symmetrical)
		this._clear_items(this.target_col_name);
	},

	create: function($super, kwargs) {
	    // This check needs to be done here, since we can't later remove this
	    // from the method lookup table, as we do with add and remove.
	    if (through)
		throw new AttributeError("Cannot use create() on a ManyToManyField which specifies an intermediary model. Use %s's Manager instead.".subs(through));
	    new_obj = $super(kwargs);
	    this.add(new_obj);
	    return new_obj;
	},

	get_or_create: function($super, kwargs) {
	    var [obj, created] = $super(kwargs);
	    // We only need to add() if created because if we got an object back
	    // from get() then the relationship already exists.
	    if (created)
		this.add(obj);
	    return [obj, created];
	},

	_add_items: function(source_col_name, target_col_name) {
	    // join_table: name of the m2m link table
	    // source_col_name: the PK colname in join_table for the source object
	    // target_col_name: the PK colname in join_table for the target object
	    // objs - objects to add. Either object instances, or primary keys of object instances.

	    var [objs, kwargs] = ManyRelatedManager.prototype._add_items.extra_arguments(arguments);
	    // If there aren't any objects, there is nothing to do.
	    if (bool(objs)) {
            // Check that all the objects are of the right type
            new_ids = new Set();
            for each (var obj in objs) {
                if (obj instanceof this.model)
                new_ids.add(obj._get_pk_val());
                else
                new_ids.add(obj);
		}
		// Add the newly created or already existing objects to the join table.
		// First find out which items are already added, to avoid adding them twice
		cursor = connection.cursor();
		cursor.execute("SELECT %s FROM %s WHERE %s = %%s AND %s IN (%s)".subs( target_col_name, this.join_table, source_col_name, target_col_name, mult(['%s'], new_ids.elements.length).join(",")), [this._pk_val].concat(new_ids.elements));
		existing_ids = new Set([row[0] for (row in cursor.fetchall())]);

		// Add the ones that aren't there already
		for each (obj_id in (new_ids.difference(existing_ids)))
		    cursor.execute("INSERT INTO %s (%s, %s) VALUES (%%s, %%s)".subs(this.join_table, source_col_name, target_col_name), [this._pk_val, obj_id]);
		transaction.commit_unless_managed();
		}
	},

	_remove_items: function(source_col_name, target_col_name) {
	    // source_col_name: the PK colname in join_table for the source object
	    // target_col_name: the PK colname in join_table for the target object
	    // objs - objects to remove

	    var [objs, kwargs] = ManyRelatedManager.prototype._remove_items.extra_arguments(arguments);
	    // If there aren't any objects, there is nothing to do.
	    if (bool(objs)) {
		// Check that all the objects are of the right type
		old_ids = new Set();
		for (var obj in objs) {
		    if (obj instanceof this.model)
			old_ids.add(obj._get_pk_val());
		    else
			old_ids.add(obj);
		}
		// Remove the specified objects from the join table
		cursor = connection.cursor();
		cursor.execute("DELETE FROM %s WHERE %s = %%s AND %s IN (%s)".subs(this.join_table, source_col_name, target_col_name, mult(['%s'], old_ids.elements.length).join(",")), [this._pk_val].concat(old_ids.elements));
		transaction.commit_unless_managed();
	    }
	},

	_clear_items: function(source_col_name) {
	    // source_col_name: the PK colname in join_table for the source object
	    cursor = connection.cursor();
	    cursor.execute("DELETE FROM %s WHERE %s = %%s".subs(this.join_table, source_col_name), [this._pk_val]);
	    transaction.commit_unless_managed();
	}
    });
    ManyRelatedManager.prototype.clear.alters_data = true;
    ManyRelatedManager.prototype.create.alters_data = true;
    ManyRelatedManager.prototype.get_or_create.alters_data = true;

    // If the ManyToMany relation has an intermediary model,
    // the add and remove methods do not exist.
    if (!through) {
	ManyRelatedManager.add_methods({
            add: function() {
                var [objs, kwargs] = ManyRelatedManager.prototype.add.extra_arguments(arguments);
                var args = [this.source_col_name, this.target_col_name].concat(objs);
                this._add_items.apply(this, args);
    
                // If this is a symmetrical m2m relation to self, add the mirror entry in the m2m table
                if (this.symmetrical) {
                    var args = [this.target_col_name, this.source_col_name].concat(objs);
                    this._add_items.apply(this, args);
                }
            },

	    remove: function() {
                var [objs, kwargs] = ManyRelatedManager.prototype.remove.extra_arguments(arguments);
                var args = [this.source_col_name, this.target_col_name].concat(objs);
                this._remove_items.apply(this, objs);
    
                // If this is a symmetrical m2m relation to self, remove the mirror entry in the m2m table
                if (this.symmetrical)  {
                    var args = [this.target_col_name, this.source_col_name].concat(objs);
                    this._remove_items.apply(this, args);
                }
	   }
        });
    }
    ManyRelatedManager.prototype.add.alters_data = true;
    ManyRelatedManager.prototype.remove.alters_data = true;
    return ManyRelatedManager;
}

var ManyRelatedObjectsDescriptor = Class('ManyRelatedObjectsDescriptor', {
    // This class provides the functionality that makes the related-object
    // managers available as attributes on a model class, for fields that have
    // multiple "remote" values and have a ManyToManyField pointed at them by
    // some other model (rather than having a ManyToManyField themselves).
    // In the example "publication.article_set", the article_set attribute is a
    // ManyRelatedObjectsDescriptor instance.
    __init__: function(related) {
	this.related = related;
    },

    __get__: function(instance, instance_type) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	// Dynamically create a class that subclasses the related
	// model's default manager.
	var rel_model = this.related.model;
	var superclass = rel_model._default_manager.constructor;
	var RelatedManager = create_many_related_manager(superclass, this.related.field.rel.through);

	var qn = connection.ops.quote_name;
	//function(model, core_filters, instance, symmetrical, join_table, source_col_name, target_col_name)
	var key = '%s__pk'.subs(this.related.field.name);
	var params = {};
	params[key] = instance._get_pk_val();
	var manager = new RelatedManager(
	    rel_model,
	    params,
	    instance,
	    false,
	    qn(this.related.field.m2m_db_table()),
	    qn(this.related.field.m2m_reverse_name()),
	    qn(this.related.field.m2m_column_name())
	);

	return manager;
    },

    __set__: function(instance, value) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	through = this.related.field.rel['through'];
	if (through)
	    throw new AttributeError("Cannot set values on a ManyToManyField which specifies an intermediary model. Use %s's Manager instead.".subs(through));

	manager = this.__get__(instance);
	manager.clear();
	manager.add.apply(this, value);
    }
});

var ReverseManyRelatedObjectsDescriptor = Class('ReverseManyRelatedObjectsDescriptor', {
    // This class provides the functionality that makes the related-object
    // managers available as attributes on a model class, for fields that have
    // multiple "remote" values and have a ManyToManyField defined in their
    // model (rather than having another model pointed *at* them).
    // In the example "article.publications", the publications attribute is a
    // ReverseManyRelatedObjectsDescriptor instance.
    __init__: function(m2m_field) {
	this.field = m2m_field;
    },

    __get__: function(instance, instance_type) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	// Dynamically create a class that subclasses the related
	// model's default manager.
	var rel_model = this.field.rel.to;
	var superclass = rel_model._default_manager.constructor;
	var RelatedManager = create_many_related_manager(superclass, this.field.rel.through);

	var qn = connection.ops.quote_name;
	var key = '%s__pk'.subs(this.field.related_query_name());
	//function(model, core_filters, instance, symmetrical, join_table, source_col_name, target_col_name)
	var params = {};
	params[key] = instance._get_pk_val();
	var manager = new RelatedManager(
	    rel_model,
	    params,
	    instance,
	    (this.field.rel.symmetrical && instance.constructor == rel_model),
	    qn(this.field.m2m_db_table()),
	    qn(this.field.m2m_column_name()),
	    qn(this.field.m2m_reverse_name())
	);

	return manager;
    },

    __set__: function(instance, value) {
	if (!isinstance(instance))
	    throw new AttributeError("Manager must be accessed via instance");

	var through = this.field.rel['through'];
	if (through)
	    throw new AttributeError("Cannot set values on a ManyToManyField which specifies an intermediary model.  Use %s's Manager instead.".subs(through));

	manager = this.__get__(instance);
	manager.clear();
	manager.add.apply(this, value);
    }
});

var ManyToOneRel = Class('ManyToOneRel', {

    __init__: function (to, field_name) {
	var [args, kwargs] = ManyToOneRel.prototype.__init__.extra_arguments(arguments, {'related_name': null, 'limit_choices_to': {}, 'lookup_overrides': {}, 'parent_link': false});

	if (isundefined(to._meta))
	    assert (isstring(to), "'to' must be either a model, a model name or the string %r".subs(RECURSIVE_RELATIONSHIP_CONSTANT));
	this.to = to;
	this.field_name = field_name;
	//TODO: ver que pasa con esto de mandarle como salamanca al piano
	extend(this, kwargs);
	//en lugar de
	//this.related_name = kwargs['related_name'];
	//this.limit_choices_to = kwargs['limit_choices_to'];
	//this.lookup_overrides = kwargs['lookup_overrides'];
	//this.parent_link = kwargs['parent_link'];
	this.multiple = true;
    },

    /*
	* Returns the Field in the 'to' object to which this relationship is tied.
	*/
    get_related_field: function() {
	var data = this.to._meta.get_field_by_name(this.field_name);
	if (!data[2])
	    throw new FieldDoesNotExist("No related field named '%s'".subs(this.field_name));
	return data[0];
    }
});

var OneToOneRel = Class('OneToOneRel', ManyToOneRel, {
    __init__: function($super, to, field_name) {
	var [args, kwargs] = OneToOneRel.prototype.__init__.extra_arguments(arguments, {'related_name': null, 'limit_choices_to': null, 'lookup_overrides': null, 'parent_link': false});

	$super(to, field_name, kwargs);
	this.multiple = false;
    }
});

var ManyToManyRel = Class('ManyToManyRel', {
    __init__: function(to) {
	this.to = to;
	var [args, kwargs] = ManyToManyRel.prototype.__init__.extra_arguments(arguments, {'related_name':null, 'limit_choices_to':{}, 'symmetrical':true, 'through': null});

	extend(this, kwargs);
	this.related_name = kwargs['related_name'];
	this.limit_choices_to = kwargs['limit_choices_to'];
	this.symmetrical = kwargs['symmetrical'];
	this.through = kwargs['through'];
	this.multiple = true;
    }
});

var ForeignKey = Class('ForeignKey', RelatedField, {
    empty_strings_allowed:false,
    __init__: function($super, to) {
	var [args, kwargs] = ForeignKey.prototype.__init__.extra_arguments(arguments, {'to_field':null, 'rel_class':ManyToOneRel, 'verbose_name': null});
	var to_field = null, rel_class = kwargs['rel_class'];

	try {
	    to_name = to._meta.object_name.toLowerCase();
	} catch (e if e instanceof TypeError ) {
	    assert(isstring(to), "%s is invalid. First parameter to ForeignKey must be either a model, a model name, or the string %s".subs(to, RECURSIVE_RELATIONSHIP_CONSTANT));
	} finally {
	    assert (!to._meta.abstracto, "cannot define a relation with abstract class %s".subs(to._meta.object_name));
	    to_field = kwargs['to_field'] || to._meta.pk.name;
	}

	kwargs['rel'] = new rel_class(to, to_field, kwargs);
	$super(kwargs);

	this.db_index = true;
    },

    get_attname: function() {
	return '%s_id'.subs(this.name);
    },

    get_validator_unique_lookup_type: function() {
	return '%s__%s__exact'.subs(this.name, this.rel.get_related_field().name);
    },

    /*
	* Here we check if the default value is an object and return the to_field if so.
	*/
    get_default: function($super) {
	var field_default = $super();
	if (field_default instanceof this.rel.to)
	    return field_default[this.rel.get_related_field().attname];
	return field_default;
    },

    get_db_prep_save: function(value) {
	if (value == '' || value == null || isundefined(value))
	    return null;
	else
	    return this.rel.get_related_field().get_db_prep_save(value);
    },

    value_to_string: function(obj) {
	if (!obj) {
	    // In required many-to-one fields with only one available choice,
	    // select that one available choice. Note: For SelectFields
	    // we have to check that the length of choices is *2*, not 1,
	    // because SelectFields always have an initial "blank" value.
	    if (!this.blank && this.choices) {
		choice_list = this.get_choices_default();
		if (choice_list.length == 2)
		    return choice_list[1][0];
	    }
	}
	return this.value_to_string(obj);
    },

    contribute_to_class: function($super, cls, name) {
	//TODO: aca esta la parte chancha grosa de los __set__ y los __get__
	// a la clase le mando el objeto luego en la instanciacion hago los enlaces
	$super(cls, name);
	var frod = new ReverseSingleRelatedObjectDescriptor(this);
	var attr = this.name;
	cls.prototype.__defineGetter__(attr, function(){ return frod.__get__(this, this.constructor); });
	cls.prototype.__defineSetter__(attr, function(value){ return frod.__set__(this, value); });
	if (isstring(this.rel.to))
	    target = this.rel.to;
	else
	    target = this.rel.to._meta.db_table
	cls._meta.duplicate_targets[this.column] = [target, "o2m"];
    },

    contribute_to_related_class: function(cls, related) {
	//TODO: aca esta la parte chancha grosa de los __set__ y los __get__
	//TODO: validar que tiene que ser de intstancia y no de clase o modelo en los manager
	var frod = new ForeignRelatedObjectsDescriptor(related);
	var attr = related.get_accessor_name();
	cls.prototype.__defineGetter__(attr, function(){ return frod.__get__(this, this.constructor); });
	cls.prototype.__defineSetter__(attr, function(value){ return frod.__set__(this, value); });
	//cls[related.get_accessor_name()] = new ForeignRelatedObjectsDescriptor(related);
    },

    formfield: function($super) {
	var [args, kwargs] = ForeignKey.prototype.formfield.extra_arguments(arguments);
	var defaults = {
	    'form_class': forms.ModelChoiceField,
	    'queryset': this.rel.to._default_manager.complex_filter(this.rel.limit_choices_to),
	    'to_field_name': this.rel.field_name
	}
	extend(defaults, kwargs);
	return $super(defaults);
    },

    db_type: function() {
	// The database column type of a ForeignKey is the column type
	// of the field to which it points. An exception is if the ForeignKey
	// points to an AutoField/PositiveIntegerField/PositiveSmallIntegerField,
	// in which case the column type is simply that of an IntegerField.
	// If the database needs similar types for key fields however, the only
	// thing we can do is making AutoField an IntegerField.
	rel_field = this.rel.get_related_field();
	if ((rel_field instanceof AutoField) || (!connection.features.related_fields_match_type && (rel_field instanceof PositiveIntegerField || rel_field instanceof PositiveSmallIntegerField)))
	    return new IntegerField().db_type();
	return rel_field.db_type();
    }
});

var OneToOneField = Class('OneToOneField', ForeignKey, {
    __init__: function($super, to, to_field) {
	//TODO: ver argumentos
	var [args, kwargs] = OneToOneField.prototype.__init__.extra_arguments(arguments);
	kwargs['unique'] = true;
	$super(to, to_field, OneToOneRel, kwargs);
    },

    contribute_to_related_class: function(cls, related) {

	var srod = new SingleRelatedObjectDescriptor(this);
	var attr = related.get_accessor_name();
	cls.prototype.__defineGetter__(attr, function(){ return srod.__get__(this, this.constructor); });
	cls.prototype.__defineSetter__(attr, function(value){ return srod.__set__(this, value); });
	if (!cls._meta.one_to_one_field)
	    cls._meta.one_to_one_field = this;
    },

    formfield: function($super) {
	var [args, kwargs] = OneToOneField.prototype.formfield.extra_arguments(arguments);
	if (this.rel.parent_link)
	    return null;
	return $super(kwargs);
    }
});

var ManyToManyField = Class('ManyToManyField', RelatedField, {
    __init__: function($super, to) {

	var [args, kwargs] = ManyToManyField.prototype.__init__.extra_arguments(arguments, {'verbose_name': null});
	var to_field = null, rel_class = kwargs['rel_class'];

	try {
	    assert (!to._meta.abstracto, "cannot define a relation with abstract class %s".subs(to._meta.object_name));
	} catch (e if e instanceof AttributeError ) {
	    assert(isstring(to), "%s is invalid. First parameter to ForeignKey must be either a model, a model name, or the string %s".subs(to, RECURSIVE_RELATIONSHIP_CONSTANT));
	}
	kwargs['rel'] = new ManyToManyRel(to, kwargs);

	this.db_table = kwargs['db_table'] || null;

	if (kwargs['rel'].through) {
	    this.creates_table = false;
	    assert (!this.db_table, "Cannot specify a db_table if an intermediary model is used.");
	} else {
	    this.creates_table = true;
	}

	$super(kwargs);

	msg = 'Hold down "Control", or "Command" on a Mac, to select more than one.';
	this.help_text = this.help_text + ' ' + msg;
    },

    get_choices_default: function($super) {
	return $super();
    },

    /*
	* Function that can be curried to provide the m2m table name for this relation
	*/
    _get_m2m_db_table: function(opts) {
	if (this.rel.through)
	    return this.rel.through_model._meta.db_table;
	else if (this.db_table)
	    return this.db_table
	else
	    return '%s_%s'.subs(opts.db_table, this.name);
    },

    /*
	* Function that can be curried to provide the source column name for the m2m table
	*/
    _get_m2m_column_name: function(related) {
	if (this._m2m_column_name_cache) {
	    return this._m2m_column_name_cache;
	} else {
	    if (this.rel.through) {
		for (f in this.rel.through_model._meta.fields)
		    if (f['rel'] && f.rel && f.rel.to == related.model) {
			this._m2m_column_name_cache = f.column;
			break;
		    }
	    }
	    // If this is an m2m relation to self, avoid the inevitable name clash
	    else if (related.model == related.parent_model) {
		this._m2m_column_name_cache = 'from_' + related.model._meta.object_name.toLowerCase() + '_id';
	    } else {
		this._m2m_column_name_cache = related.model._meta.object_name.toLowerCase() + '_id';
	    }

	    // Return the newly cached value
	    return this._m2m_column_name_cache;
	}
    },

    /*
	* Function that can be curried to provide the related column name for the m2m table
	*/
    _get_m2m_reverse_name: function(related) {

	if (this._m2m_reverse_name_cache) {
	    return this._m2m_reverse_name_cache;
	} else {
	    if (this.rel.through) {
		found = false;
		for (f in this.rel.through_model._meta.fields) {
		    if (f['rel'] && f.rel && f.rel.to == related.parent_model) {
			if (related.model == related.parent_model) {
			    // If this is an m2m-intermediate to self,
			    // the first foreign key you find will be
			    // the source column. Keep searching for
			    // the second foreign key.
			    if (found) {
				this._m2m_reverse_name_cache = f.column;
				break;
			    } else {
				found = true;
			    }
			} else {
			    this._m2m_reverse_name_cache = f.column;
			    break;
			}
		    }
		}
	    }
	    // If this is an m2m relation to self, avoid the inevitable name clash
	    else if (related.model == related.parent_model) {
		this._m2m_reverse_name_cache = 'to_' + related.parent_model._meta.object_name.toLowerCase() + '_id';
	    } else {
		this._m2m_reverse_name_cache = related.parent_model._meta.object_name.toLowerCase() + '_id';
	    }

	    // Return the newly cached value
	    return this._m2m_reverse_name_cache;
	}
    },

    /*
	* Validates that the value is a valid list of foreign keys
	*/
    isValidIDList: function(field_data, all_data) {
	mod = this.rel.to;
	try {
	    pks = field_data.split(',').map(function(e) {
		var n = Number(e);
		if (isNaN(n))
		    throw new ValueError(e);
		return e;
	    });
	} catch (e if e instanceof ValueError) {
	    // the CommaSeparatedIntegerField validator will catch this error
	    return;
	}
	objects = mod._default_manager.in_bulk.apply(this, pks);
	if (objects.length != pks.length) {
	    badkeys = [k for (k in pks) if (!include(objects, k))];
	    throw new ValidationError(
		"Please enter valid %(self)s IDs. The value %(value)r is invalid.Please enter valid %(self)s IDs. The values %(value)r are invalid.");
	}
    },

    value_to_string: function(obj) {
	var data = '';
	if (obj) {
	    qs = getattr(obj, this.name).all();
	    data = [instance._get_pk_val() for (instance in qs)];
	} else {
	    // In required many-to-many fields with only one available choice,
	    // select that one available choice.
	    if (!this.blank) {
		choices_list = this.get_choices_default();
		if (choices_list.length == 1)
		    data = [choices_list[0][0]];
	    }
	}
	return data;
    },

    contribute_to_class: function($super, cls, name) {
	// To support multiple relations to self, it's useful to have a non-None
	// related name on symmetrical relations for internal reasons. The
	// concept doesn't make a lot of sense externally ("you want me to
	// specify *what* on my non-reversible relation?!"), so we set it up
	// automatically. The funky name reduces the chance of an accidental
	// clash.
	if (this.rel.symmetrical && this.rel.to == "this" && !this.rel.related_name)
	    this.rel.related_name = "%s_rel_+".subs(name);

	$super(cls, name);
	// Add the descriptor for the m2m relation
	var rmrod = new ReverseManyRelatedObjectsDescriptor(this);
	var attr = this.name;
	cls.prototype.__defineGetter__(attr, function(){ return rmrod.__get__(this, this.constructor); });
	cls.prototype.__defineSetter__(attr, function(value){ return rmrod.__set__(this, value); });

	// Set up the accessor for the m2m table name for the relation
	this.m2m_db_table = this._get_m2m_db_table.curry(cls._meta);

	// Populate some necessary rel arguments so that cross-app relations
	// work correctly.
	if (isstring(this.rel.through)) {
	    function resolve_through_model(field, model, cls) {
		field.rel.through_model = model;
	    }
	    add_lazy_relation(cls, this, this.rel.through, resolve_through_model);
	}
	else if (this.rel.through) {
	    this.rel.through_model = this.rel.through;
	    this.rel.through = this.rel.through._meta.object_name;
	}

	if (isstring(this.rel.to))
	    target = this.rel.to;
	else
	    target = this.rel.to._meta.db_table;
	cls._meta.duplicate_targets[this.column] = [target, "m2m"]
    },

    contribute_to_related_class: function(cls, related) {
	// m2m relations to self do not have a ManyRelatedObjectsDescriptor,
	// as it would be redundant - unless the field is non-symmetrical.
	if (related.model != related.parent_model || !this.rel.symmetrical) {
	    // Add the descriptor for the m2m relation
	    var mrod = new ManyRelatedObjectsDescriptor(this);
	    var attr = related.get_accessor_name();
	    cls.prototype.__defineGetter__(attr, function(){ return mrod.__get__(this, this.constructor); });
	    cls.prototype.__defineSetter__(attr, function(value){ return mrod.__set__(this, value); });
	}
    
	// Set up the accessors for the column names on the m2m table
	this.m2m_column_name = this._get_m2m_column_name.curry(related);
	this.m2m_reverse_name = this._get_m2m_reverse_name.curry(related);
    },

    set_attributes_from_rel: function() {},

    /*
	* Returns the value of this field in the given model instance.
	*/
    value_from_object: function(obj) {
        return obj[this.attname].all();
    },

    save_form_data: function(instance, data) {
        instance[this.attname] = data;
    },

    formfield: function($super) {
        var [args, kwargs] = ManyToManyField.prototype.formfield.extra_arguments(arguments);
        var defaults = {'form_class': forms.ModelMultipleChoiceField, 'queryset': this.rel.to._default_manager.complex_filter(self.rel.limit_choices_to)}
        extend(defaults, kwargs);
        // If initial is passed in, it's a list of related objects, but the
        // MultipleChoiceField takes a list of IDs.
        if (defaults['initial'])
            defaults['initial'] = [i._get_pk_val() for each (i in defaults['initial'])];
        return $super(defaults);
    },

    db_type: function() {
	// A ManyToManyField is not represented by a single column,
	// so return None.
	return null;
    }
});

$P({	'RelatedField': RelatedField,
        'SingleRelatedObjectDescriptor': SingleRelatedObjectDescriptor,
        'ReverseSingleRelatedObjectDescriptor': ReverseSingleRelatedObjectDescriptor,
        'ForeignRelatedObjectsDescriptor': ForeignRelatedObjectsDescriptor,
        'ManyRelatedObjectsDescriptor': ManyRelatedObjectsDescriptor,
        'ReverseManyRelatedObjectsDescriptor': ReverseManyRelatedObjectsDescriptor,
        'ManyToOneRel': ManyToOneRel,
        'OneToOneRel': OneToOneRel,
        'ManyToManyRel': ManyToManyRel,
        'ForeignKey': ForeignKey,
        'OneToOneField': OneToOneField,
        'ManyToManyField': ManyToManyField });
