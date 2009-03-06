$D("doff.db.models.base");
$L('copy', 'copy', 'deepcopy');
$L("doff.core.exceptions", 'ObjectDoesNotExist', 'MultipleObjectsReturned', 'FieldError');
$L("doff.db.models.fields", 'AutoField');
$L("doff.db.models.fields.related", 'OneToOneRel', 'ManyToOneRel', 'OneToOneField');
$L("doff.db.models.sql");
$L("doff.db.models.manager");
$L("doff.db.models.options", 'Options');
$L("doff.db.models.loading", 'register_models', 'get_model');
$L('functional', 'curry');
$L('event');

var subclass_exception = function(name, parent, module) {
    var klass = type(name, parent);
    klass.prototype.__module__ = module;
    return klass;
}
    
var Model = type('Model', {
    '__new__': function __new__(name, bases, attrs) {
        if (name == 'Model' && bases[0] == object ) {
            // estoy creando el modelo,
            return super(Model, this).__new__(name, bases, attrs);
            }
        // Create the class.
        var module = this.__module__;
        attrs['__module__'] = module;
        super(Model, this).__new__(name, bases, attrs);
        
        var attr_meta = attrs['Meta'] || new Object();
        var abstracto = attr_meta['abstracto'] || false;
        var meta = attr_meta;
        var base_meta = this.prototype['_meta'];

        var app_label = meta['app_label'];
        if (!app_label) {
            app_label = module.split('.').slice(-2)[0];
        }

        this.add_to_class('_meta', new Options(meta, app_label));

        if (!abstracto) {
            this.add_to_class('DoesNotExist', subclass_exception('DoesNotExist', ObjectDoesNotExist, module));
            this.add_to_class('MultipleObjectsReturned', subclass_exception('MultipleObjectsReturned', MultipleObjectsReturned, module));
            this.DoesNotExist = this.prototype.DoesNotExist;
            this.MultipleObjectsReturned = this.prototype.MultipleObjectsReturned;

            if (base_meta && !base_meta.abstracto) {
                // Non-abstract child classes inherit some attributes from their
                // non-abstract parent (unless an ABC comes before it in the
                // method resolution order).
                if (!meta['ordering'])
                    this._meta.ordering = base_meta.ordering;
                if (!meta['get_latest_by'])
                    this._meta.get_latest_by = base_meta.get_latest_by;
            }
        }

        if (this['_default_manager'])
            this._default_manager = null;

        // Bail out early if we have already created this class.
        var m = get_model(this._meta.app_label, name, false);
        if (m) return m;

        // Add all attributes to the class.
        for (var obj_name in attrs)
            this.add_to_class(obj_name, attrs[obj_name]);

        // Do the appropriate setup for any model parents.
        var o2o_map = new Dict([[f.rel.to, f] for (f in this._meta.local_fields) if (f instanceof OneToOneField)]);
        for each (var base in bases) {
            if (base['_meta']) {

                // All the fields of any type declared on this model
                var new_fields = this._meta.local_fields.concat(this._meta.local_many_to_many).concat(this._meta.virtual_fields);
                var field_names = new Set([f.name for each (f in new_fields)]);

                if (!base._meta.abstracto) {
                    // Concrete classes...
                    if (include(o2o_map, base)) {
                        var field = o2o_map.get(base);
                        field.primary_key = true;
                        this._meta.setup_pk(field);
                    } else {
                        var attr_name = '%s_ptr'.subs(base._meta.module_name);
                        var field = new OneToOneField(base, null ,{'name':attr_name, 'auto_created':true, 'parent_link':true})
                        this.add_to_class(attr_name, field);
                    }
                    //TODO: parents no va porque la herencia es simple debe ser solo parent
                    this._meta.parents.set(base, field);
                } else {
                    // .. and abstract ones.

                    // Check for clashes between locally declared fields and those
                    // on the ABC.
                    var parent_fields = base._meta.local_fields.concat(base._meta.local_many_to_many);
                    for each (var field in parent_fields) {
                        if (include(field_names, field.name))
                            throw new FieldError('Local field %s in class %s clashes with field of similar name from abstract base class %s'.subs(field.name, name, base.__name__));
                        this.add_to_class(field.name, deepcopy(field));
                    }
                    // Pass any non-abstract parent classes onto child.
                    this._meta.parents.update(base._meta.parents);
                }
                // Inherit managers from the abstract base classes.
                var base_managers = base._meta.abstract_managers;
                base_managers.sort();
                for each (var element in base_managers) {
                    var [none, mgr_name, manager] = element;
                    var val = this[mgr_name];
                    //TODO: la copia de los manager
                    if (!val || val == manager) {
                        var new_manager = manager._copy_to_model(this);
                        this.add_to_class(mgr_name, new_manager);
                    }
                }

                // Inherit virtual fields (like GenericForeignKey) from the parent class
                for each (var field in base._meta.virtual_fields) {
                    if (base._meta.abstracto && include(field_names, field.name))
                        throw new FieldError('Local field %s in class %s clashes with field of similar name from abstract base class %s'.subs(field.name, name, base.__name__));
                    this.add_to_class(field.name, deepcopy(field));
                }
            }
        }
        if (abstracto) {
            // Abstract base models can't be instantiated and don't appear in
            // the list of models for an app. We do the final setup for them a
            // little differently from normal models.
            attr_meta.abstracto = false;
            this.Meta = attr_meta;
            return this;
        }

        this._prepare();
        register_models(this._meta.app_label, this);

        // Because of the way imports happen (recursively), we may or may not be
        // the first time this model tries to register with the framework. There
        // should only be one class for each model, so we always return the
        // registered version.
        return get_model(this._meta.app_label, name, false);
    },

    'add_to_class': function add_to_class(name, value) {
        if (value && value['contribute_to_class'])
            value.contribute_to_class(this, name);
        else
            this.prototype[name] = value;
    },

    /* Creates some methods once self._meta has been populated. */
    '_prepare': function _prepare() {

        var opts = this._meta;
        opts._prepare(this);

        if (opts.order_with_respect_to) {
            this.prototype.get_next_in_order = curry(this.prototype._get_next_or_previous_in_order, true);
            this.prototype.get_previous_in_order = curry(this.prototype._get_next_or_previous_in_order, false);
            var key = 'get_%s_order'.subs(this.__name__.toLowerCase());
            opts.order_with_respect_to.rel.to[key] = curry(method_get_order, this);
            key = 'set_%s_order'.subs(this.__name__.toLowerCase());
            opts.order_with_respect_to.rel.to[key] = curry(method_set_order, this);
        }
            // Give the class a docstring -- its definition.
        if (!this.__doc__)
            this.__doc__ = "%s(%s)".subs(this.__name__, [f.attname for each (f in opts.fields)].join(', '));

        event.publish('class_prepared', [ this ]);
    }

},{
    '__init__': function __init__() {
        arguments = new Arguments(arguments);
        var args = arguments.args;
        var kwargs = arguments.kwargs;
	event.publish('pre_init', [this.constructor, args, kwargs]);
        // There is a rather weird disparity here; if kwargs, it's set, then args
        // overrides it. It should be one or the other; don't duplicate the work
        // The reason for the kwargs check is that standard iterator passes in by
        // args, and instantiation for iteration is 33% faster.
        var args_len = args.length;
        if (args_len > this._meta.fields.length)
            // Daft, but matches old exception sans the err msg.
            throw new IndexError("Number of args exceeds number of fields");

        var data = zip(args, this._meta.fields);
        if (bool(keys(kwargs))) {
            for each (var [val, field] in data)
                this[field.attname] = val;
        } else {
            for each (var [val, field] in data) {
                this[field.attname] = val;
                delete kwargs[field.name];
                // Maintain compatibility with existing calls.
                if (field.rel instanceof ManyToOneRel)
                    delete kwargs[field.attname];
            }
        }

        for each (var field in this._meta.fields) {
            var rel_obj = null, val = null;
            if (bool(keys(kwargs))) {
                if (field.rel instanceof ManyToOneRel) {
                    rel_obj = kwargs[field.name] || null;
                    delete kwargs[field.name];
                    if (!rel_obj) {
                        val = kwargs[field.attname] || null;
                        delete kwargs[field.attname];
                            if (!val) {
                                val = field.get_default();
                            }
                    } else if (rel_obj == null && field.none) {
                        val = null;
                    }
                } else {
                    val = kwargs[field.attname] || field.get_default();
                    delete kwargs[field.attname];
                }
            } else {
                val = field.get_default();
            }
            
            // If we got passed a related instance, set it using the field.name
            // instead of field.attname (e.g. "user" instead of "user_id") so
            // that the object gets properly cached (and type checked) by the
            // RelatedObjectDescriptor.
            if (rel_obj) {
                this[field.name] = rel_obj;
            } else {
                this[field.attname] = val;
            }
        }
        
	event.publish('post_init', [this.constructor, this]);
    },

    '__str__': function __str__() {
        return '%s object'.subs(this.constructor.__name__);
    },

    '__eq__': function __eq__(other) {
        return (other instanceof this.constructor) && this._get_pk_val() == other._get_pk_val()
    },

    '__ne__': function __ne__(other) {
        return !this.__eq__(other);
    },

    '_get_pk_val': function _get_pk_val(meta) {
        if (!meta)
            meta = this._meta;
        return this[meta.pk.attname] || null;
    },

    get pk() {
        return this._get_pk_val();
    },

    '_set_pk_val': function _set_pk_val(value) {
        return this[this._meta.pk.attname] = value;
    },

    set pk(value) {
        this._set_pk_val(value);
    },
    
    /*
        * Saves the current instance. Override this in a subclass if you want to
        control the saving process.

        The 'force_insert' and 'force_update' parameters can be used to insist
        that the "save" must be an SQL insert or update (or equivalent for
        non-SQL backends), respectively. Normally, they should not be set.
        */
    'save': function save(force_insert, force_update) {
        var force_insert = force_insert || false;
        var force_update = force_update || false;
        if (force_insert && force_update)
            throw new ValueError("Cannot force both insert and updating in model saving.");
        this.save_base(false, null, force_insert, force_update);
    },

    /*
        * Does the heavy-lifting involved in saving. Subclasses shouldn't need to
        override this method. It's separate from save() in order to hide the
        need for overrides of save() to pass around internal-only parameters
        ('raw' and 'cls').
        */
    'save_base': function save_base(raw, cls, force_insert, force_update) {
        
        assert (!(force_insert && force_update));
        var cls = cls || null;
        if (!cls) {
            var cls = this.constructor;
            meta = this._meta;
            signal = true;
            event.publish('pre_save', [this.constructor, this, raw]);
        } else {
            meta = cls._meta;
            signal = false;
        }

        // If we are in a raw save, save the object exactly as presented.
        // That means that we don't try to be smart about saving attributes
        // that might have come from the parent class - we just save the
        // attributes we have been given to the class we have been given.
        if (!raw) {
            for each (var [parent, field] in meta.parents) {
                // At this point, parent's primary key field may be unknown
                // (for example, from administration form which doesn't fill
                // this field). If so, fill it.
                if (!this[parent._meta.pk.attname] && this[field.attname])
                    this[parent._meta.pk.attname] = this[field.attname];

                this.save_base(raw, parent);
                this[field.attname] = this._get_pk_val(parent._meta);
            }
        }
        non_pks = [f for each (f in meta.local_fields) if (!f.primary_key)];

        // First, try an UPDATE. If that doesn't update anything, do an INSERT.
        pk_val = this._get_pk_val(meta);
        pk_set = pk_val != null;
        record_exists = true;
        manager = cls._default_manager;
        if (pk_set) {
            // Determine whether a record with the primary key already exists.
            if ((force_update || (!force_insert && bool(manager.filter({'pk':pk_val}).extra({'a': 1}).values('a').order_by())))) {
                // It does already exist, so do an UPDATE.
                if (force_update || non_pks) {
                    values = [[f, null, f.get_db_prep_save(raw && this[f.attname] || f.pre_save(this, false))] for each (f in non_pks)];
                    rows = manager.filter({'pk':pk_val})._update(values);
                    if (force_update && !rows)
                        throw new DatabaseError("Forced update did not affect any rows.");
                }
            } else { record_exists = false; }
        }
        if (!pk_set || !record_exists) {
            if (!pk_set) {
                if (force_update)
                    throw new ValueError("Cannot force an update in save() with no primary key.");
                values = [[f, f.get_db_prep_save(raw && this[f.attname] || f.pre_save(this, true))] for each (f in meta.local_fields) if (!(f instanceof AutoField))];
            } else {
                values = [[f, f.get_db_prep_save(raw && this[f.attname] || f.pre_save(this, true))] for each (f in meta.local_fields)];
            }

            if (meta.order_with_respect_to) {
                field = meta.order_with_respect_to;
                var key1 = field.name;
                values.concat([meta.get_field_by_name('_order')[0], manager.filter({key1: this[field.attname]}).count()]);
            }
            record_exists = false;

            update_pk = bool(meta.has_auto_field && !pk_set);
            if (bool(values))
                // Create a new record.
                result = manager._insert(values, {'return_id':update_pk});
            else
                // Create a new record with defaults for everything.
                result = manager._insert([[meta.pk, connection.ops.pk_default_value()]], {'return_id':update_pk, 'raw_values':true});

            if (update_pk) {
                this[meta.pk.attname] = result;
            }
        }
        //transaction.commit_unless_managed()

        if (signal)
	    event.publish('post_save', [this.constructor, this, !record_exists, raw]);
    },

    /*
        * Recursively populates seen_objs with all objects related to this
        object.

        When done, seen_objs.items() will be in the format:
            [(model_class, {pk_val: obj, pk_val: obj, ...}),
                (model_class, {pk_val: obj, pk_val: obj, ...}), ...]
        */
    '_collect_sub_objects': function _collect_sub_objects(seen_objs, parent, nullable) {
        pk_val = this._get_pk_val();
        if (seen_objs.add(this.constructor, pk_val, this, parent || null, nullable || false))
            return;

        for each (related in this._meta.get_all_related_objects()) {
            rel_opts_name = related.get_accessor_name();
            if (related.field.rel instanceof OneToOneRel) {
                try {
                    sub_obj = this[rel_opts_name];
                } catch (e if e instanceof ObjectDoesNotExist){}
                sub_obj._collect_sub_objects(seen_objs, this.constructor, related.field.None);
            } else {
                for each (sub_obj in this[rel_opts_name].all())
                    sub_obj._collect_sub_objects(seen_objs, this.constructor, related.field.none);
            }
        }
        // Handle any ancestors (for the model-inheritance case). We do this by
        // traversing to the most remote parent classes -- those with no parents
        // themselves -- and then adding those instances to the collection. That
        // will include all the child instances down to "self".
        parent_stack = this._meta.parents.values();
        while (parent_stack) {
            link = parent_stack.pop();
            parent_obj = this[link.name];
            if (parent_obj._meta.parents) {
                parent_stack.concat(parent_obj._meta.parents.values());
                continue;
            }
            // At this point, parent_obj is base class (no ancestor models). So
            // delete it and all its descendents.
            parent_obj._collect_sub_objects(seen_objs);
        }
    },

    'del': function del() {
        assert (this._get_pk_val(), "%s object can't be deleted because its %s attribute is set to None.".subs(this._meta.object_name, this._meta.pk.attname));

        // Find all the objects than need to be deleted.
        seen_objs = new CollectedObjects();
        this._collect_sub_objects(seen_objs);

        // Actually delete the objects.
        delete_objects(seen_objs);
    },

    '_get_FIELD_display': function _get_FIELD_display(field) {
        value = this[field.attname];
        return str(new Dict(field.flatchoices).get(value, value));
    },

    '_get_next_or_previous_by_FIELD': function _get_next_or_previous_by_FIELD(field, is_next) {
        arguments = new Arguments(arguments);
        var op = is_next && 'gt' || 'lt';
        var order = !is_next && '-' || '';
        var param = this[field.attname];
        var key = '%s__%s'.subs(field.name, op);
        var q = new Q({key: param});
        key2 = 'pk__%s'.subs(op);
        var key2 = field.name;
        q = q.or(Q({key2: param, key: this.pk}));
        qs = this.constructor._default_manager.filter(arguments.kwargs).filter(q).order_by('%s%s'.subs(order, field.name), '%spk'.subs(order));
        try {
            return qs.get(0);
        } catch (e if e instanceof IndexError) {
            throw new this.DoesNotExist("%s matching query does not exist.".subs(this.constructor._meta.object_name));
        }
    },

    '_get_next_or_previous_in_order': function _get_next_or_previous_in_order(is_next) {
        cachename = "__%s_order_cache".subs(is_next);
        if (!this[cachename]) {
            qn = connection.ops.quote_name;
            op = is_next && '>' || '<';
            order = ! is_next && '-_order' || '_order';
            order_field = this._meta.order_with_respect_to;
            // FIXME: When querysets support nested queries, this can be turned
            // into a pure queryset operation.
            where = ['%s %s (SELECT %s FROM %s WHERE %s=%%s)'.subs(
                qn('_order'), op, qn('_order'),
                qn(this._meta.db_table), qn(this._meta.pk.column))];
            params = [this.pk];
            var key1 = order_field.name;
            obj = this._default_manager.filter({key1: this[order_field.attname]}).extra(null, where, params).order_by(order).get(0, 1).get();
            this[cachename] = obj;
        }
        return this[cachename];
    }

});

Model.prototype.save.alters_data = true;
Model.prototype.save_base.alters_data = true;
Model.prototype.del.alters_data = true;

// HELPER FUNCTIONS (CURRIED MODEL METHODS)
//
// ORDERING METHODS #########################

var method_set_order = function(ordered_obj, id_list) {
    var rel_val = this[ordered_obj._meta.order_with_respect_to.rel.field_name];
    var order_name = ordered_obj._meta.order_with_respect_to.name;
    // FIXME: It would be nice if there was an "update many" version of update
    // for situations like this.
    //for ([i, j] in enumerate(id_list))
        //ordered_obj.objects.filter({'pk': j, 'order_name': rel_val}).update({'_order':i});
};


var method_get_order = function(ordered_obj) {
    var rel_val = this[ordered_obj._meta.order_with_respect_to.rel.field_name];
    var order_name = ordered_obj._meta.order_with_respect_to.name;
    var pk_name = ordered_obj._meta.pk.name;
    return [r[pk_name] for each (r in ordered_obj.objects.filter({'order_name': rel_val}).values(pk_name))];
};

$P({ 'Model': Model });
