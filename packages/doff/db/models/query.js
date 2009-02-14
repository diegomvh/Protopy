$D("doff.db.models.query");

$L('doff.utils.set', 'Set');
$L('doff.db', 'connection', 'IntegrityError');
$L('doff.db.models.fields', 'DateField');
$L('doff.db.models.query_utils', 'Q', 'select_related_descend');
$L('doff.db.models.signals');
$L('doff.db.models.sql');
$L('copy', 'copy');

var CHUNK_SIZE = 100;
var ITER_CHUNK_SIZE = CHUNK_SIZE;

var CyclicDependency = Class('CyclicDependency', Exception);

/*
 * A container that stores keys and lists of values along with remembering the
 * parent objects for all the keys.
 * This is used for the database object deletion routines so that we can
 * calculate the 'leaf' objects which should be deleted first.
 */
var CollectedObjects = Class('CollectedObjects', {
    __init__: function() {
        this.data = {};
        this.children = {};
    },

    /*
     * Adds an item to the container.
     *  Arguments:
     *  * model - the class of the object being added.
     *  * pk - the primary key.
     *  * obj - the object itthis.
     *  * parent_model - the model of the parent object that this object was
     *    reached through.
     *  * nullable - should be True if this relation is nullable.
     * Returns True if the item already existed in the structure and
     * False otherwise.
     */
    add: function(model, pk, obj, parent_model, nullable) {
        nullable = nullable || false;
        if (isundefined(this.data[model]))
            this.data[model] = new Hash();
        var d = this.data[model];
        var retval = pk in d;
        d[pk] = obj
        if (parent_model && !nullable) {
            if (isundefined(this.children[parent_model]))
                this.children[parent_model] = [];
            this.children[parent_model].push(model);
        }
        return retval;
    },

    contains: function(key) {
        return key in this.data;
    },

    get: function(key) {
        return this.data[key];
    },

    empty: function() {
        return bool(keys(this.data));
    },

    iteritems: function() {
        for (k in this.ordered_keys()) {
            var ret = [k, this.get(k)];
            yield ret;
        }
    },

    items: function(){
        return this.iteritems();
    },

    keys: function(){
        return this.ordered_keys();
    },

    /*
     *  Returns the models in the order that they should be dealt with (i.e.
     *  models with no dependencies first).
     */
    ordered_keys: function() {
        var dealt_with = new SortedDict();
        // Start with items that have no children
        models = keys(this.data);
        while (dealt_with.size() < models.length) {
            found = false;
            for (model in models) {
                if (dealt_with.inclued(model))
                    continue;
                children = this.children.setdefault(model, []);
                var list = [c for each (c in children) if (!include(dealt_with, c))];
                if (list.length == 0) {
                    dealt_with.set(model, null);
                    found = true;
                }
            }
            if (!found)
                throw new CyclicDependency("There is a cyclic dependency of items to be processed.");
        }
        return dealt_with.keys();
    },

    /*
     * Fallback for the case where is a cyclic dependency but we don't  care.
     */
    unordered_keys: function() {
        return this.data.keys();
    }
});


/*
 * Represents a lazy database lookup for a set of objects.
 */
var QuerySet = Class('QuerySet', {

    __init__: function(model, query) {
        this.model = model || null;
        this.query = query || new sql.Query(this.model, connection);
        this._result_cache = null;
        this._iter = null;
        this._sticky_filter = false;
        // Magic methods or the wish list
        //I whish __len__ , but
        this.__defineGetter__('length', function(){
            // Since __len__ is called quite frequently (for example, as part of
            // list(qs), we make some effort here to be as efficient as possible
            // whilst not messing up any existing iterators against the QuerySet.
            if (!this._result_cache) {
                if (this._iter) {
                    this._result_cache = array(this._iter);
                } else {
                    var gen = this.iterator();
                    this._result_cache = array(gen);
                }
            } else if (this._iter)
                this._result_cache.concat(array(this._iter));
            return this._result_cache.length;
        });
    },

    _result_iter: function() {
        var pos = 0;
        while (true) {
            var upper = this._result_cache.length;
            while (pos < upper) {
                var ret = this._result_cache[pos];
                yield ret;
                pos = pos + 1;
            }
            if (!this._iter)
                throw StopIteration
            if (this._result_cache.length <= pos)
                this._fill_cache();
        }
    },

    //I whish __nonzero__ , but
    __nonzero__: function(){
        if (this._result_cache)
            return bool(this._result_cache);
        try {
            Iterator(this).next();
        }
        catch (e if e == StopIteration) {
            return false;
        }
        return true;
    },

    //I whish __getitem__ , but
    /*
     * Retrieves an item or slice from the set of results.
     */
    slice: function(begin, end) {
    /*    if not isinstance(k, (slice, int, long)):
            raise TypeError
        assert ((not isinstance(k, slice) and (k >= 0))
                or (isinstance(k, slice) and (k.start is None or k.start >= 0)
                    and (k.stop is None or k.stop >= 0))), \
                "Negative indexing is not supported."

        if this._result_cache is not None:
            if this._iter is not None:
                // The result cache has only been partially populated, so we may
                // need to fill it out a bit more.
                if isinstance(k, slice):
                    if k.stop is not None:
                        // Some people insist on passing in strings here.
                        bound = int(k.stop)
                    else:
                        bound = None
                else:
                    bound = k + 1
                if len(this._result_cache) < bound:
                    this._fill_cache(bound - len(this._result_cache))
            return this._result_cache[k]

        if isinstance(k, slice):
            qs = this._clone()
            if k.start is not None:
                start = int(k.start)
            else:
                start = None
            if k.stop is not None:
                stop = int(k.stop)
            else:
                stop = None
            qs.query.set_limits(start, stop)
            return k.step and list(qs)[::k.step] or qs
        try:
            qs = this._clone()
            qs.query.set_limits(k, k + 1)
            return list(qs)[0]
        except this.model.DoesNotExist, e:
            raise IndexError, e.args*/
    },

    //I whish __and__ , but
    and: function(other) {
        this._merge_sanity_check(other);
        if (other instanceof EmptyQuerySet)
            return other._clone();
        combined = this._clone();
        combined.query.combine(other.query, sql.AND);
        return combined;
    },

    //I whish __or__ , but
    or: function(other){
        this._merge_sanity_check(other)
        combined = this._clone();
        if (other instanceof EmptyQuerySet)
            return combined;
        combined.query.combine(other.query, sql.OR);
        return combined;
    },

    // METHODS THAT DO DATABASE QUERIES
    /*
     * An iterator over the results from applying this QuerySet to the database.
     */
    iterator: function() {
        var fill_cache = this.query.select_related;
        if (fill_cache instanceof Object)
            requested = fill_cache;
        else
            requested = null
        var max_depth = this.query.max_depth
        var extra_select = this.query.extra_select.keys()
        var index_start = extra_select.length
        for (var row in this.query.results_iter()) {
            if (fill_cache)
                [obj, none] = get_cached_row(this.model, row, index_start, max_depth, requested);
            else
                obj = new this.model(row);
            for (var [i, k] in Iterator(extra_select)) {
                obj[k] = row[i];
            }
            yield obj;
        }
    },

    /*
     * Performs a SELECT COUNT() and returns the number of records as an
     * integer.
     * If the QuerySet is already fully cached this simply returns the length
     * of the cached results set to avoid multiple SELECT COUNT(*) calls.
     */
    count: function() {
        if ((this._result_cache) && (!this._iter))
            return this._result_cache.length;
        return this.query.get_count();
    },

    /*
     * Performs the query and returns a single object matching the given
     * keyword arguments.
     */
    get: function() {
        var [args, kwargs] = QuerySet.prototype.get.extra_arguments(arguments);
        clone = this.filter.apply(this, args.concat(kwargs));
        num = clone.length;
        if (num == 1)
            return clone._result_cache[0];
        if (num == 0)
            throw new this.model.DoesNotExist("%s matching query does not exist.".subs(this.model._meta.object_name));
        throw new this.model.MultipleObjectsReturned("get() returned more than one %s -- it returned %s! Lookup parameters were %s".subs(this.model._meta.object_name, num, kwargs));
    },

    /*
     * Creates a new object with the given kwargs, saving it to the database
     * and returning the created object.
     */
    create: function(kwargs) {
        var obj = this.model(kwargs);
        obj.save(true);
        return obj;
    },

    /*
     * Looks up an object with the given kwargs, creating one if necessary.
        Returns a tuple of (object, created), where created is a boolean
        specifying whether an object was created.
    */
    get_or_create: function(kwargs) {

        var [args, kwargs] = QuerySet.prototype.get_or_create.extra_arguments(arguments);
        assert (kwargs, 'get_or_create() must be passed at least one keyword argument')
        defaults = kwargs['defaults'] || {};
        try {
            return [this.get(kwargs), false];
        } catch (e if e instanceof this.model.DoesNotExist) {
            try {
                params = dict([(k, v) for ([k, v] in kwargs.items()) if (k.indefOf('__') == -1)]);
                params.update(defaults);
                obj = new this.model(params);
                sid = transaction.savepoint();
                obj.save(true, null);
                transaction.savepoint_commit(sid);
                return [obj, true];
            } catch (e if e instanceof IntegrityError) {
                transaction.savepoint_rollback(sid);
                try {
                    return [this.get(kwargs), false];
                } catch (e if e instanceof this.model.DoesNotExist) {
                    throw e;
                }
            }
        }
    },

    /*
     * Returns the latest object, according to the model's 'get_latest_by'
     * option or optional given field_name.
     */
    latest: function(field_name) {
        var latest_by = field_name || this.model._meta.get_latest_by;
        if (!latest_by) throw "Assert latest() requires either a field_name parameter or 'get_latest_by' in the model";
        if (!this.query.can_filter()) "Assert Cannot change a query once a slice has been taken.";
        var obj = this._clone();
        obj.query.set_limits(null, 1);
        obj.query.add_ordering('-%s'.subs(latest_by));
        return obj.get();
    },

    /* Returns a dictionary mapping each of the given IDs to the object with that ID. */
    in_bulk: function(id_list) {
        if (!this.query.can_filter()) throw " Assert Cannot use 'limit' or 'offset' with in_bulk.";
        if (!isarray(id_list)) throw " Assert in_bulk() must be provided with a list of IDs.";
        if (bool(id_list))
            return {};
        qs = this._clone();
        qs.query.add_filter(['pk__in', id_list])
        var list = [[obj._get_pk_val(), obj] for (obj in qs.iterator())];
        return create(list);
    },

    /* Deletes the records in the current QuerySet. */
    del: function() {
        if (!this.query.can_filter()) throw " Assert Cannot use 'limit' or 'offset' with delete.";

        del_query = this._clone();

        // Disable non-supported fields.
        del_query.query.select_related = false;
        del_query.query.clear_ordering();
/*
        // Delete objects in chunks to prevent the list of related objects from becoming too long.
        while 1
            // Collect all the objects to be deleted in this chunk, and all the
            // objects that are related to the objects that are to be deleted.
            seen_objs = CollectedObjects();
            for object in del_query[:CHUNK_SIZE]
                object._collect_sub_objects(seen_objs)

            if not seen_objs:
                break
            delete_objects(seen_objs)

        // Clear the result cache, in case this QuerySet gets reused.
        this._result_cache = null;*/
    },

    /*
     * Updates all elements in the current QuerySet, setting all the given
     * fields to the appropriate values.
     */
    update: function(kwargs) {
        if (!this.query.can_filter()) throw " Assert Cannot update a query once a slice has been taken.";
        query = this.query.clone(sql.UpdateQuery);
        query.add_update_values(kwargs);
        rows = query.execute_sql(null);
        transaction.commit_unless_managed();
        this._result_cache = null;
        return rows;
    },

    /*
     * A version of update that accepts field objects instead of field names.
     * Used primarily for model saving and not intended for use by general
     * code (it requires too much poking around at model internals to be
     * useful at that level).
     */
    _update: function(values) {
        if (!this.query.can_filter()) throw " Assert Cannot update a query once a slice has been taken.";
        var query = this.query.clone(sql.UpdateQuery);
        query.add_update_fields(values);
        this._result_cache = null;
        return query.execute_sql(null);
    },

    // PUBLIC METHODS THAT RETURN A QUERYSET SUBCLASS

    values: function() {
        var [fields, kwargs] = QuerySet.prototype.values.extra_arguments(arguments);
        return this._clone(ValuesQuerySet, true, {'_fields': fields});
    },

    values_list: function() {
        var [fields, kwargs] = QuerySet.prototype.values_list.extra_arguments(arguments);
        var flat = kwargs['flat'] || false;
        if (bool(keys(kwargs)))
            throw new TypeError('Unexpected keyword arguments to values_list: %s'.subs(keys(kwargs)));
        if (flat && fields.length > 1)
            throw new TypeError("'flat' is not valid when values_list is called with more than one field.");
        return this._clone(ValuesListQuerySet, true, {'flat':flat, '_fields':fields});
    },

    /*
     * Returns a list of datetime objects representing all available dates for
     * the given field_name, scoped to 'kind'.
     */
    dates: function(field_name, kind, order) {

        var order = order || 'ASC';
        if (include(["month", "year", "day"], kind)) throw "Assert 'kind' must be one of 'year', 'month' or 'day'.";
        if (include(['ASC', 'DESC'], order)) throw "Assert 'order' must be either 'ASC' or 'DESC'.";
        return this._clone(DateQuerySet, true, { '_field_name':field_name, '_kind':kind, '_order':order});
    },

    /* Returns an empty QuerySet. */
    none: function() {
        return this._clone(EmptyQuerySet);
    },

    // PUBLIC METHODS THAT ALTER ATTRIBUTES AND RETURN A NEW QUERYSET

    /*
     * Returns a new QuerySet that is a copy of the current one. This allows a
     * QuerySet to proxy for a model manager in some cases.
     */
    all: function(){
        return this._clone();
    },

    /*
     * Returns a new QuerySet instance with the args ANDed to the existing set.
     */
    filter: function() {
        var [args, kwargs] = QuerySet.prototype.filter.extra_arguments(arguments);
        return this._filter_or_exclude(false, args, kwargs);
    },

    /*
     * Returns a new QuerySet instance with NOT (args) ANDed to the existing set.
     */
    exclude: function(){
        var [args, kwargs] = QuerySet.prototype.exclude.extra_arguments(arguments);
        return this._filter_or_exclude(true, args, kwargs);
    },

    _filter_or_exclude: function(negate, args, kwargs) {
        if (bool(args) || bool(keys(kwargs)))
            if (!this.query.can_filter())
                throw new Exception("Cannot filter a query once a slice has been taken.");
        var clone = this._clone();
        if (negate)
            clone.query.add_q(new Q(args, kwargs).invert());
        else
            clone.query.add_q(new Q(args, kwargs));
        return clone;
    },

    /*
     * Returns a new QuerySet instance with filter_obj added to the filters.
     * filter_obj can be a Q object (or anything with an add_to_query()
     * method) or a dictionary of keyword lookup arguments.
     * This exists to support framework features such as 'limit_choices_to',
     * and usually it will be more natural to use other methods.
     */
    complex_filter: function (filter_obj) {
        if ((filter_obj instanceof Q) || (filter_obj['add_to_query'])){
            clone = this._clone();
            clone.query.add_q(filter_obj);
            return clone;
        }
        else
            return this._filter_or_exclude(null, [], filter_obj);
    },

    /*
     * Returns a new QuerySet instance that will select related objects.
     * If fields are specified, they must be ForeignKey fields and only those
     * related objects are included in the selection.
     */
    select_related: function() {

        var [fields, kwargs] = QuerySet.prototype.select_related.extra_arguments(arguments);
        var depth = kwargs['depth'] || 0;
        delete kwargs['depth'];
        if (bool(keys(kwargs)))
            throw new TypeError('Unexpected keyword arguments to select_related: %s'.subs(keys(kwargs)));
        obj = this._clone();
        if (bool(fields)) {
            if (depth != 0)
                throw new TypeError('Cannot pass both "depth" and fields to select_related()');
            obj.query.add_select_related(fields);
        }
        else
            obj.query.select_related = true;
        if (depth != 0)
            obj.query.max_depth = depth;
        return obj;
    },

    /*
     * Copies the related selection status from the QuerySet 'other' to the
     * current QuerySet.
     */
    dup_select_related: function(other) {
        this.query.select_related = other.query.select_related;
    },

     /* Returns a new QuerySet instance with the ordering changed. */
    order_by: function(field_names) {
        var [field_names, kwargs] = QuerySet.prototype.order_by.extra_arguments(arguments);
        if (!this.query.can_filter()) throw " Assert Cannot reorder a query once a slice has been taken.";
        var obj = this._clone();
        obj.query.clear_ordering();
        obj.query.add_ordering.apply(obj.query, field_names);
        return obj;
    },

    /* Returns a new QuerySet instance that will select only distinct results. */
    distinct: function(true_or_false) {
        true_or_false = true_or_false || true;
        obj = this._clone();
        obj.query.distinct = true_or_false;
        return obj;
    },

    /* Adds extra SQL fragments to the query. */
    extra: function(select, where, params, tables, order_by, select_params) {
        if (!this.query.can_filter()) throw " Assert Cannot change a query once a slice has been taken.";
        var clone = this._clone();
        clone.query.add_extra(select, select_params, where, params, tables, order_by);
        return clone;
    },

    /* Reverses the ordering of the QuerySet. */
    reverse: function() {
        var clone = this._clone();
        clone.query.standard_ordering = !clone.query.standard_ordering;
        return clone;
    },

    // PRIVATE METHODS

    _clone: function(klass, setup, extra) {
        setup = setup || false;
        klass = klass || this.constructor;
        var query = this.query.clone()
        if (this._sticky_filter)
            query.filter_is_sticky = true;
        var c = new klass(this.model, query);
        if (extra)
            extend(c, extra);
        if (setup && c['_setup_query'])
            c._setup_query();
        return c;
    },

    /*
     * Fills the result cache with 'num' more entries (or until the results
     * iterator is exhausted).
     */
    _fill_cache: function(num) {
        num = num || ITER_CHUNK_SIZE;
        if (this._iter)
            try {
                Protopy.log('begin _fill_cache');
                for (i = 0; i < num; i++)
                    this._result_cache.push(this._iter.next());
                Protopy.log('end _fill_cache, elements %s'.subs(this._result_cache.length));
            } catch (stop) {
                Protopy.log('end _fill_cache, elements %s'.subs(this._result_cache.length));
                this._iter = null;
            }
    },

    /*
     * Indicates that the next filter call and the one following that should
     * be treated as a single filter. This is only important when it comes to
     * determining when to reuse tables for many-to-many filters. Required so
     * that we can filter naturally on the results of related managers.
     * This doesn't return a clone of the current QuerySet (it returns
     * "this"). The method is only used internally and should be immediately
     * followed by a filter() that does create a clone.
     */
    _next_is_sticky: function() {
        this._sticky_filter = true;
        return this;
    },

    _merge_sanity_check: function(other) {
    }
});

QuerySet.prototype.__iterator__ = function() {
    if (!this._result_cache) {
        this._iter = this.iterator();
        this._result_cache = [];
    }
    if (this._iter)
        return this._result_iter();
    // Python's list iterator is better than our version when we're just
    // iterating over the cache.
    return Iterator(this._result_cache);
};

QuerySet.prototype.del.alters_data = true;
QuerySet.prototype.update.alters_data = true;
QuerySet.prototype._update.alters_data = true;

var ValuesQuerySet = Class('ValuesQuerySet', QuerySet, {
    __init__: function($super) {
        var [args, kwargs] = ValuesQuerySet.prototype.__init__.extra_arguments(arguments);
        args.push(kwargs);
        $super.apply(this, args);
        this.query.select_related = false;

        // QuerySet.clone() will also set up the _fields attribute with the
        // names of the model fields to select.
    },

    iterator: function() {
        if (!this.extra_names && this.field_names.length != this.model._meta.fields.length)
            this.query.trim_extra_select(this.extra_names);
        var names = keys(this.query.extra_select).concat(this.field_names);
        for (row in this.query.results_iter()) {
            var ret = create(zip(names, row));
            yield ret;
        }
    },


    /*
     * Constructs the field_names list that the values query will be
     * retrieving.
     * Called by the _clone() method after initializing the rest of the
     * instance.
     */
    _setup_query: function() {

        this.extra_names = [];
        if (this._fields) {
            if (!this.query.extra_select) {
                field_names = this._fields;
            } else {
                field_names = [];
                for each (var f in this._fields)
                    if (this.query.extra_select[f])
                        this.extra_names.push(f);
                    else
                        field_names.push(f);
            }
        } else {
            // Default to all fields.
            field_names = [f.attname for each (f in this.model._meta.fields)];
        }
        this.query.add_fields(field_names, false);
        this.query.default_cols = false;
        this.field_names = field_names;
    },

    /*
     * Cloning a ValuesQuerySet preserves the current fields.
     */
    _clone: function($super, klass, setup, extra) {
        var c = $super(klass, setup, extra);
        c._fields = copy(this._fields);
        c.field_names = this.field_names;
        c.extra_names = this.extra_names;
        if (setup && c['_setup_query'])
            c._setup_query();
        return c;
    },

    _merge_sanity_check: function($super, other) {
        $super._merge_sanity_check(other)
        if (new Set(this.extra_names).ne(new Set(other.extra_names)) ||
            new Set(this.field_names).ne(new Set(other.field_names)))
            throw new TypeError("Merging '%s' classes must involve the same values in each case.".subs(this.__class__.__name__));
    }
});

var ValuesListQuerySet = Class('ValuesListQuerySet', ValuesQuerySet, {
    iterator: function() {
        this.query.trim_extra_select(this.extra_names);
        if ((this.flat) && (this._fields.length == 1))
            for (var row in this.query.results_iter())
                yield row[0];
        else if (!this.query.extra_select)
            for (var row in this.query.results_iter())
                yield row;
        else
            // When extra(select=...) is involved, the extra cols come are
            // always at the start of the row, so we need to reorder the fields
            // to match the order in this._fields.
            names = Objects.keys(this.query.extra_select) + this.field_names;
            for (var row in this.query.results_iter()) {
                data = create(names.zip(row));
                var ret = [data[f] for (f in this._fields)];
                yield ret;
            }
    },

    _clone: function($super) {
        var [args, kwargs] = ValuesListQuerySet.prototype.filter.extra_arguments(arguments);
        clone = $super.apply(this, args.push(kwargs));
        clone.flat = this.flat;
        return clone;
    }
});

var DateQuerySet = Class('DateQuerySet', QuerySet, {
    iterator: function() {
        return this.query.results_iter();
    },

    /*
     * Sets up any special features of the query attribute.
     * Called by the _clone() method after initializing the rest of the
     * instance.
     */
    _setup_query: function() {

        this.query = this.query.clone(sql.DateQuery, { 'setup': true});
        this.query.select = [];
        var field = this.model._meta.get_field(this._field_name, false);
        if (! field instanceof DateField) throw "Assert %s isn't a DateField.".subs(field.name);
        this.query.add_date_select(field, this._kind, this._order);
        if (field.none)
            this.query.add_filter(['%s__isnull'.subs(field.name), false])
    },

    _clone: function($super, klass, setup, extra) {
        var c = $super(klass, false, extra);
        c._field_name = this._field_name;
        c._kind = this._kind;
        if (setup && c['_setup_query'])
            c._setup_query();
        return c;
    }
});

var EmptyQuerySet = Class('EmptyQuerySet', QuerySet, {
    __init__: function($super, model, query) {
        $super(model, query);
        this._result_cache = [];
    },

    and: function(other) {
        return this._clone();
    },

    or: function(other) {
        return other._clone();
    },

    count: function() {
        return 0;
    },

    del: function() {},

    _clone: function($super, klass, setup, extra) {
        var c = $super(klass, setup, extra);
        c._result_cache = [];
        return c;
    },

    iterator: function() {
        yield Iterator([]).next();
    }
});

/*
 * Helper function that recursively returns an object with the specified
 * related attributes already populated.
 */
function get_cached_row(klass, row, index_start, max_depth, cur_depth, requested) {
    var max_depth = max_depth || 0;
    var cur_depth = cur_depth || 0;
    var requested = requested || null;
    if (max_depth && !requested && cur_depth > max_depth)
        // We've recursed deeply enough; stop now.
        return null;

    restricted = requested  != null;
    index_end = index_start + klass._meta.fields.length;
    fields = row.slice(index_start,index_end);
    var list = [x for (x in fields) if (x)];
    if (bool(list))
        // If we only have a list of Nones, there was not related object.
        obj = null;
    else
        obj = new klass(fields);
    for (f in klass._meta.fields) {
        if (!select_related_descend(f, restricted, requested))
            continue;
        if (restricted)
            next = requested[f.name];
        else
            next = null;
        cached_row = get_cached_row(f.rel.to, row, index_end, max_depth, cur_depth + 1, next);
        if (cached_row) {
            [rel_obj, index_end] = cached_row;
            if (obj)
                obj[f.get_cache_name()] = rel_obj;
        }
    }
    return [obj, index_end];
}

/*
 *Iterate through a list of seen classes, and remove any instances that are referred to.
 */
function delete_objects(seen_objs) {
    try {
        ordered_classes = seen_objs.keys();
    } catch (e if e instanceof CyclicDependency) {
        // If there is a cyclic dependency, we cannot in general delete the
        // objects.  However, if an appropriate transaction is set up, or if the
        // database is lax enough, it will succeed. So for now, we go ahead and
        // try anyway.
        ordered_classes = seen_objs.unordered_keys();
    }

    obj_pairs = {};
    for (cls in ordered_classes) {
        items = seen_objs[cls].items();
        items.sort();
        obj_pairs[cls] = items;

        // Pre-notify all instances to be deleted.
        for (element in items) {
            var [pk_val, instance] = element;
            events.pre_delete.fire({'sender':cls, 'instance':instance});
        }
        pk_list = [pk for ([pk, instance] in items)];
        del_query = new sql.DeleteQuery(cls, connection);
        del_query.delete_batch_related(pk_list);

        update_query = new sql.UpdateQuery(cls, connection);
        for (elements in cls._meta.get_fields_with_model()) {
            var [field, model] = elements;
            if (field.rel && field.none && include(seen_objs, field.rel.to) && field.rel.to._meta.fields.values().filter(function(f) { return f.column == field.column})) {
                if (model)
                    new sql.UpdateQuery(model, connection).clear_related(field, pk_list);
                else
                    update_query.clear_related(field, pk_list);
            }
        }
    }
    // Now delete the actual data.
    for (cls in ordered_classes) {
        items = obj_pairs[cls];
        items.reverse();

        pk_list = [pk for ([pk,instance] in items)];
        del_query = new sql.DeleteQuery(cls, connection);
        del_query.delete_batch(pk_list);

        // Last cleanup; set NULLs where there once was a reference to the
        // object, NULL the primary key of the found objects, and perform
        // post-notification.
        for (element in items) {
            var [pk_val, instance] = element;
            for (field in cls._meta.fields) {
                if (field.rel && field.none && include(seen_objs, field.rel.to))
                    instance[field.attname] = null;
            }
            events.post_delete.fire({'sender':cls, 'instance':instance});
            instance[cls._meta.pk.attname] = null;
        }
    }
    //transaction.commit_unless_managed();
}

/*
 * Inserts a new record for the given model. This provides an interface to
 * the InsertQuery class and is how Model.save() is implemented. It is not
 * part of the public API.
 */
var insert_query = function(model, values, return_id, raw_values) {
    var return_id = return_id || false;
    var raw_values = raw_values || false;
    var query = new sql.InsertQuery(model, connection);
    query.insert_values(values, raw_values);
    return query.execute_sql(return_id);
}

$P({    'Q': Q,
		'QuerySet': QuerySet,
        'EmptyQuerySet': EmptyQuerySet,
        'insert_query': insert_query   });