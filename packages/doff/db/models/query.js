$D("doff.db.models.query");

$L('doff.db', 'connection', 'IntegrityError');
$L('doff.db.models.fields', 'DateField');
$L('doff.db.models.query_utils', 'Q', 'select_related_descend');
$L('doff.db.models.signals');
$L('doff.db.models.sql');
$L('doff.db.transaction');
$L('copy', 'copy');

var CHUNK_SIZE = 100;
var ITER_CHUNK_SIZE = CHUNK_SIZE;

var CyclicDependency = type('CyclicDependency', Exception);

/*
 * A container that stores keys and lists of values along with remembering the
 * parent objects for all the keys.
 * This is used for the database object deletion routines so that we can
 * calculate the 'leaf' objects which should be deleted first.
 */
var CollectedObjects = type('CollectedObjects', {
    '__init__': function __init__() {
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
    'add': function add(model, pk, obj, parent_model, nullable) {
        nullable = nullable || false;
        if (!this.data[model])
            this.data[model] = new Hash();
        var d = this.data[model];
        var retval = pk in d;
        d[pk] = obj
        if (parent_model && !nullable) {
            if (!this.children[parent_model])
                this.children[parent_model] = [];
            this.children[parent_model].push(model);
        }
        return retval;
    },

    '__contains__': function __contains__(key) {
        return include(this.data, key);
    },

    '__getitem__': function __getitem__(key) {
        return this.data[key]
    },

    '__nonzero__': function __nonzero__() {
        return bool(keys(this.data));
    },

    'iteritems': function iteritems() {
        for (k in this.ordered_keys()) {
            var ret = [k, this.get(k)];
            yield ret;
        }
    },

    'items': function items(){
        return this.iteritems();
    },

    'keys': function keys(){
        return this.ordered_keys();
    },

    /*
     *  Returns the models in the order that they should be dealt with (i.e.
     *  models with no dependencies first).
     */
    'ordered_keys': function ordered_keys() {
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
    'unordered_keys': function unordered_keys() {
        return this.data.keys();
    }
});


/*
 * Represents a lazy database lookup for a set of objects.
 */
var QuerySet = type('QuerySet', {

    '__init__': function __init__(model, query) {
        this.model = model || null;
        this.query = query || new sql.Query(this.model, connection);
        this._result_cache = null;
        this._iter = null;
        this._sticky_filter = false;
    },

    '_result_iter': function _result_iter() {
        var pos = 0;
        while (true) {
            var upper = this._result_cache.length;
            while (pos < upper) {
                var ret = this._result_cache[pos];
                yield ret;
                pos = pos + 1;
            }
            if (this._iter == null)
                throw StopIteration;
            if (this._result_cache.length <= pos)
                this._fill_cache();
        }
    },

    //I whish __nonzero__ , but
    '__nonzero__': function __nonzero__(){
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

    '__iter__': function __iter__() {
        if (this._result_cache == null) {
            this._iter = this.iterator();
            this._result_cache = [];
        }
        if (this._iter != null)
            return this._result_iter();
        // Python's list iterator is better than our version when we're just
        // iterating over the cache.
        function array_iter(array) {
            for each (var element in array)
                yield element;
        }
        return array_iter(this._result_cache);
    },

    '__len__': function __len__(){
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
    },

    get length() {
        return len(this);
    },
    
    /*
     * Retrieves an item or slice from the set of results.
    __getitem__: function __getitem__(k) {
        """
        Retrieves an item or slice from the set of results.
        """
        if not isinstance(k, (slice, int, long)):
            raise TypeError
        assert ((not isinstance(k, slice) and (k >= 0))
                or (isinstance(k, slice) and (k.start is None or k.start >= 0)
                    and (k.stop is None or k.stop >= 0))), \
                "Negative indexing is not supported."

        if self._result_cache is not None:
            if self._iter is not None:
                # The result cache has only been partially populated, so we may
                # need to fill it out a bit more.
                if isinstance(k, slice):
                    if k.stop is not None:
                        # Some people insist on passing in strings here.
                        bound = int(k.stop)
                    else:
                        bound = None
                else:
                    bound = k + 1
                if len(self._result_cache) < bound:
                    self._fill_cache(bound - len(self._result_cache))
            return self._result_cache[k]

        if isinstance(k, slice):
            qs = self._clone()
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
            qs = self._clone()
            qs.query.set_limits(k, k + 1)
            return list(qs)[0]
        except self.model.DoesNotExist, e:
            raise IndexError, e.args
    },
    */

    'slice': function(start, stop, step){
        this.__getitem__([start, stop, step]);
    },

    //I whish __and__ , but
    'and': function and(other) {
        this._merge_sanity_check(other);
        if (other instanceof EmptyQuerySet)
            return other._clone();
        combined = this._clone();
        combined.query.combine(other.query, sql.AND);
        return combined;
    },

    //I whish __or__ , but
    'or': function or(other){
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
    'iterator': function iterator() {
        var fill_cache = this.query.select_related;
        if (fill_cache instanceof Object)
            requested = fill_cache;
        else
            requested = null
        var max_depth = this.query.max_depth
        var extra_select = this.query.extra_select.keys()
        var index_start = extra_select.length
        for each (var row in this.query.results_iter()) {
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
    'count': function count() {
        if ((this._result_cache) && (!this._iter))
            return this._result_cache.length;
        return this.query.get_count();
    },

    /*
     * Performs the query and returns a single object matching the given
     * keyword arguments.
     */
    'get': function get() {
        //TODO: Si es un get con un numero es para indexar tipo array invocar a __getitem__
        arguments = new Arguments(arguments);
        var clone = this.filter.apply(this, arguments.argskwargs);
        var num = clone.length;
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
    'create': function create(kwargs) {
        var obj = this.model(kwargs);
        obj.save(true);
        return obj;
    },

    /*
     * Looks up an object with the given kwargs, creating one if necessary.
        Returns a tuple of (object, created), where created is a boolean
        specifying whether an object was created.
    */
    'get_or_create': function get_or_create() {
        arguments = new Arguments(arguments);
        var kwargs = arguments.kwargs;
        assert (bool(kwargs), 'get_or_create() must be passed at least one keyword argument')
        var defaults = kwargs['defaults'] || {};
        delete kwargs['defaults'];
        try {
            return [this.get(kwargs), false];
        } catch (e if e instanceof this.model.DoesNotExist) {
            try {
                extend(kwargs, defaults);
                var obj = new this.model(kwargs);
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
    'latest': function latest(field_name) {
        var latest_by = field_name || this.model._meta.get_latest_by;
        if (!latest_by) throw "Assert latest() requires either a field_name parameter or 'get_latest_by' in the model";
        if (!this.query.can_filter()) "Assert Cannot change a query once a slice has been taken.";
        var obj = this._clone();
        obj.query.set_limits(null, 1);
        obj.query.add_ordering('-%s'.subs(latest_by));
        return obj.get();
    },

    /* Returns a dictionary mapping each of the given IDs to the object with that ID. */
    'in_bulk': function in_bulk(id_list) {
        if (!this.query.can_filter()) throw " Assert Cannot use 'limit' or 'offset' with in_bulk.";
        if (type(id_list) != Array) throw " Assert in_bulk() must be provided with a list of IDs.";
        if (bool(id_list))
            return {};
        qs = this._clone();
        qs.query.add_filter(['pk__in', id_list])
        var list = [[obj._get_pk_val(), obj] for (obj in qs.iterator())];
        return create(list);
    },

    /* Deletes the records in the current QuerySet. */
    'del': function del() {
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
    'update': function update(kwargs) {
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
    '_update': function _update(values) {
        if (!this.query.can_filter()) throw " Assert Cannot update a query once a slice has been taken.";
        var query = this.query.clone(sql.UpdateQuery);
        query.add_update_fields(values);
        this._result_cache = null;
        return query.execute_sql(null);
    },

    // PUBLIC METHODS THAT RETURN A QUERYSET SUBCLASS

    'values': function values() {
        arguments = new Arguments(arguments);
        var fields = arguments.args;
        return this._clone(ValuesQuerySet, true, {'_fields': fields});
    },

    'values_list': function values_list() {
        arguments = new Arguments(arguments);
        var fields = arguments.args;
        var flat = arguments.kwargs['flat'] || false;
        if (bool(arguments.kwargs))
            throw new TypeError('Unexpected keyword arguments to values_list: %s'.subs(keys(arguments.kwargs)));
        if (flat && fields.length > 1)
            throw new TypeError("'flat' is not valid when values_list is called with more than one field.");
        return this._clone(ValuesListQuerySet, true, {'flat':flat, '_fields':fields});
    },

    /*
     * Returns a list of datetime objects representing all available dates for
     * the given field_name, scoped to 'kind'.
     */
    'dates': function dates(field_name, kind, order) {

        var order = order || 'ASC';
        if (include(["month", "year", "day"], kind)) throw "Assert 'kind' must be one of 'year', 'month' or 'day'.";
        if (include(['ASC', 'DESC'], order)) throw "Assert 'order' must be either 'ASC' or 'DESC'.";
        return this._clone(DateQuerySet, true, { '_field_name':field_name, '_kind':kind, '_order':order});
    },

    /* Returns an empty QuerySet. */
    'none': function none() {
        return this._clone(EmptyQuerySet);
    },

    // PUBLIC METHODS THAT ALTER ATTRIBUTES AND RETURN A NEW QUERYSET

    /*
     * Returns a new QuerySet that is a copy of the current one. This allows a
     * QuerySet to proxy for a model manager in some cases.
     */
    'all': function all(){
        return this._clone();
    },

    /*
     * Returns a new QuerySet instance with the args ANDed to the existing set.
     */
    'filter': function filter() {
        arguments = new Arguments(arguments);
        return this._filter_or_exclude.apply(this, [false].concat(arguments.argskwargs));
    },

    /*
     * Returns a new QuerySet instance with NOT (args) ANDed to the existing set.
     */
    'exclude': function exclude(){
        arguments = new Arguments(arguments);
        return this._filter_or_exclude.apply(this, [true].concat(arguments.argskwargs));
    },

    '_filter_or_exclude': function _filter_or_exclude(negate) {
        arguments = new Arguments(arguments);
        if (bool(arguments.args) || bool(keys(arguments.kwargs)))
            if (!this.query.can_filter())
                throw new Exception("Cannot filter a query once a slice has been taken.");
        var clone = this._clone();
        if (negate)
            clone.query.add_q(new Q(arguments.args, arguments.kwargs).invert());
        else
            clone.query.add_q(new Q(arguments.args, arguments.kwargs));
        return clone;
    },

    /*
     * Returns a new QuerySet instance with filter_obj added to the filters.
     * filter_obj can be a Q object (or anything with an add_to_query()
     * method) or a dictionary of keyword lookup arguments.
     * This exists to support framework features such as 'limit_choices_to',
     * and usually it will be more natural to use other methods.
     */
    'complex_filter': function complex_filter(filter_obj) {
        if (isinstance(filter_obj, Q) || callable(filter_obj['add_to_query'])) {
            clone = this._clone();
            clone.query.add_q(filter_obj);
            return clone;
        } else {
            return this._filter_or_exclude(null, [], filter_obj);
        }
    },

    /*
     * Returns a new QuerySet instance that will select related objects.
     * If fields are specified, they must be ForeignKey fields and only those
     * related objects are included in the selection.
     */
    'select_related': function select_related() {
        arguments = new Arguments(arguments);
        var fields = arguments.args;
        var kwargs = arguments.kwargs;
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
    'dup_select_related': function dup_select_related(other) {
        this.query.select_related = other.query.select_related;
    },

     /* Returns a new QuerySet instance with the ordering changed. */
    'order_by': function order_by() {
        arguments = new Arguments(arguments);
        var field_names = arguments.args;
        var kwargs = arguments.kwargs;
        assert(this.query.can_filter(), "Assert Cannot reorder a query once a slice has been taken.");
        var obj = this._clone();
        obj.query.clear_ordering();
        obj.query.add_ordering.apply(obj.query, field_names);
        return obj;
    },

    /* Returns a new QuerySet instance that will select only distinct results. */
    'distinct': function distinct(true_or_false) {
        true_or_false = true_or_false || true;
        obj = this._clone();
        obj.query.distinct = true_or_false;
        return obj;
    },

    /* Adds extra SQL fragments to the query. */
    'extra': function extra(select, where, params, tables, order_by, select_params) {
        if (!this.query.can_filter()) throw " Assert Cannot change a query once a slice has been taken.";
        var clone = this._clone();
        clone.query.add_extra(select, select_params, where, params, tables, order_by);
        return clone;
    },

    /* Reverses the ordering of the QuerySet. */
    'reverse': function reverse() {
        var clone = this._clone();
        clone.query.standard_ordering = !clone.query.standard_ordering;
        return clone;
    },

    // PRIVATE METHODS

    '_clone': function _clone(klass, setup, extra) {
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
    '_fill_cache': function _fill_cache(num) {
        num = num || ITER_CHUNK_SIZE;
        if (this._iter != null)
            try {
                for (i = 0; i < num; i++)
                    this._result_cache.push(this._iter.next());
            } catch (stop if stop == StopIteration) {
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
    '_next_is_sticky': function _next_is_sticky() {
        this._sticky_filter = true;
        return this;
    },

    '_merge_sanity_check': function _merge_sanity_check(other) {
    }
});

QuerySet.prototype.del.alters_data = true;
QuerySet.prototype.update.alters_data = true;
QuerySet.prototype._update.alters_data = true;

var ValuesQuerySet = type('ValuesQuerySet', QuerySet, {
    '__init__': function __init__() {
        arguments = new Arguments(arguments);
        super(QuerySet, this).__init__(arguments);
        this.query.select_related = false;

        // QuerySet.clone() will also set up the _fields attribute with the
        // names of the model fields to select.
    },

    'iterator': function iterator() {
        if (!bool(this.extra_names) && this.field_names.length != this.model._meta.fields.length)
            this.query.trim_extra_select(this.extra_names);
        var names = this.query.extra_select.keys().concat(this.field_names);
        for each (var row in this.query.results_iter()) {
            yield row;
        }
    },


    /*
     * Constructs the field_names list that the values query will be
     * retrieving.
     * Called by the _clone() method after initializing the rest of the
     * instance.
     */
    '_setup_query': function _setup_query() {

        this.extra_names = [];
        if (bool(this._fields)) {
            if (!bool(this.query.extra_select)) {
                var field_names = this._fields;
            } else {
                var field_names = [];
                for each (var f in this._fields)
                    if (this.query.extra_select.get(f, false))
                        this.extra_names.push(f);
                    else
                        field_names.push(f);
            }
        } else {
            // Default to all fields.
            var field_names = [f.attname for each (f in this.model._meta.fields)];
        }
        this.query.add_fields(field_names, false);
        this.query.default_cols = false;
        this.field_names = field_names;
    },

    /*
     * Cloning a ValuesQuerySet preserves the current fields.
     */
    '_clone': function _clone(klass, setup, extra) {
        var c = super(QuerySet, this)._clone(klass, setup, extra);
        c._fields = copy(this._fields);
        c.field_names = this.field_names;
        c.extra_names = this.extra_names;
        if (setup && c['_setup_query'])
            c._setup_query();
        return c;
    },

    '_merge_sanity_check': function _merge_sanity_check(other) {
        super(QuerySet, this)._merge_sanity_check(other);
        if (new Set(this.extra_names).ne(new Set(other.extra_names)) ||
            new Set(this.field_names).ne(new Set(other.field_names)))
            throw new TypeError("Merging '%s' classes must involve the same values in each case.".subs(this.__class__.__name__));
    }
});

var ValuesListQuerySet = type('ValuesListQuerySet', ValuesQuerySet, {
    'iterator': function iterator() {
        this.query.trim_extra_select(this.extra_names);
        if ((this.flat) && (this._fields.length == 1)) {
            for each (var row in this.query.results_iter())
                yield row[0];
        } else if (!bool(this.query.extra_select)) {
            for each (var row in this.query.results_iter())
                yield row;
        } else {
            // When extra(select=...) is involved, the extra cols come are
            // always at the start of the row, so we need to reorder the fields
            // to match the order in this._fields.
            names = this.query.extra_select.keys().concat(this.field_names);
            for each (var row in this.query.results_iter()) {
                data = create(names.zip(row));
                var ret = [data[f] for (f in this._fields)];
                yield ret;
            }
        }
    },

    '_clone': function _clone() {
        arguments = new Arguments(arguments);
        clone = super(ValuesQuerySet, this)._clone(arguments);
        clone.flat = this.flat;
        return clone;
    }
});

var DateQuerySet = type('DateQuerySet', QuerySet, {
    'iterator': function iterator() {
        return this.query.results_iter();
    },

    /*
     * Sets up any special features of the query attribute.
     * Called by the _clone() method after initializing the rest of the
     * instance.
     */
    '_setup_query': function _setup_query() {

        this.query = this.query.clone(sql.DateQuery, {'setup': true});
        this.query.select = [];
        var field = this.model._meta.get_field(this._field_name, false);
        if (!isinstance(field, DateField)) throw "Assert %s isn't a DateField.".subs(field.name);
        this.query.add_date_select(field, this._kind, this._order);
        if (field.none)
            this.query.add_filter(['%s__isnull'.subs(field.name), false])
    },

    '_clone': function _clone(klass, setup, extra) {
        var c = super(QuerySet, this)._clone(klass, false, extra);
        c._field_name = this._field_name;
        c._kind = this._kind;
        if (setup && c['_setup_query'])
            c._setup_query();
        return c;
    }
});

var EmptyQuerySet = type('EmptyQuerySet', QuerySet, {
    '__init__': function __init__(model, query) {
        super(QuerySet, this).__init__(model, query);
        this._result_cache = [];
    },

    'and': function and(other) {
        return this._clone();
    },

    'or': function or(other) {
        return other._clone();
    },

    'count': function count() {
        return 0;
    },

    'del': function del() {},

    '_clone': function _clone(klass, setup, extra) {
        var c = super(QuerySet, this)._clone(klass, setup, extra);
        c._result_cache = [];
        return c;
    },

    'iterator': function iterator() {
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