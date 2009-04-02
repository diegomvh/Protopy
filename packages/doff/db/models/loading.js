$D("doff.db.models.loading, Utilities for loading models and the modules that contain them.");
$L('doff.core.project', 'get_settings');
$L('doff.core.exceptions', 'ImproperlyConfigured');
$L('doff.utils.datastructures', 'SortedDict');

var settings = get_settings();

/*
 * A cache that stores installed applications and their models. Used to
 * provide reverse-relations and for app introspection (e.g. admin).
 */
var AppCache = type('AppCache', {
    '__init__': function __init__() {
        this.app_store = new SortedDict();

        // Mapping of app_labels to a dictionary of model names to model code.
        this.app_models = new SortedDict();

        // Mapping of app_labels to errors raised when trying to import the app.
        this.app_errors = {};

        // -- Everything below here is only used when populating the cache --
        this.loaded = false;
        this.handled = {};
        this.postponed = [];
        this.nesting_level = 0;
    },

    /*
        * Fill in all the cache information. This method is threadsafe, in the
        * sense that every caller will see the same state upon return, and if the
        * cache is already initialised, it does no work.
        */
    '_populate': function _populate() {

        if (this.loaded)
            return
        for each (var app_name in settings.INSTALLED_APPS) {
            if (app_name in this.handled)
                continue
            this.load_app(app_name, true);
        }
        if (!this.nesting_level) {
            for each (var app_name in this.postponed)
                this.load_app(app_name);
            this.loaded = true;
        }
    },

    /*
        * Loads the app with the provided fully qualified name, and returns the model module.
        */
    'load_app': function load_app(app_name, can_postpone) {
        this.handled[app_name] = null;
        this.nesting_level = this.nesting_level + 1;
        var mod = $L(app_name + '.models');
        this.nesting_level = this.nesting_level - 1;
            /*if not hasattr(mod, 'models'):
            if can_postpone:
                # Either the app has no models, or the package is still being
                # imported by Python and the model module isn't available yet.
                # We will check again once all the recursion has finished (in
                # populate).
                self.postponed.append(app_name)
            return None*/
        if (!this.app_store.has_key(mod))
            this.app_store.set(mod, len(this.app_store));
        return mod;
    },

    /*
        * Returns true if the model cache is fully populated.
        * Useful for code that wants to cache the results of get_models() for
        * themselves once it is safe to do so.
        */
    'app_cache_ready': function app_cache_ready() {
        return this.loaded;
    },

    /*
        * Returns a list of all installed modules that contain models.
        */
    'get_apps': function get_apps() {
        this._populate();

        // Ensure the returned list is always in the same order (with new apps
        // added at the end). This avoids unstable ordering on the admin app
        // list page, for example.
        var apps = [[v, k] for each ([k, v] in this.app_store.items())];
        apps.sort();
        return [elt[1] for each (elt in apps)];
    },

    /*
        * Returns the module containing the models for the given app_label. If
        * the app has no models in it and 'emptyOK' is True, returns None.
        */
    'get_app': function get_app(app_label) {
        this._populate()
        for each (var app_name in settings.INSTALLED_APPS) {
            mod = this.load_app(app_name, False)
            if (mod)
                return mod;
        }
        throw new ImproperlyConfigured("App with label %s could not be found".subs(app_label));
    },

        /*
        * Returns the map of known problems with the INSTALLED_APPS.
        */
    'get_app_errors': function get_app_errors() {
        this._populate();
        return this.app_errors;
    },

    /*
        * Given a module containing models, returns a list of the models.
        * Otherwise returns a list of all installed models.
        */
    'get_models': function get_models(app_mod) {
        this._populate();
        if (app_mod) {
            return this.app_models.get(app_mod.__name__.split('.').slice(-2)[0], new SortedDict()).values()
        } else {
            var model_list = [];
            for each (var app_entry in this.app_models.values())
                model_list = model_list.concat(app_entry.values());
            return model_list;
        }
    },

    /* 
        * Returns the model matching the given app_label and case-insensitive model_name.
        * Returns None if no model is found.
        */
    'get_model': function get_model(app_label, model_name, seed_cache) {
    
        if (seed_cache)
            this._populate();
        return this.app_models.get(app_label, new SortedDict()).get(model_name.toLowerCase());
    },

    /*
        * Register a set of models as belonging to an app.
        */
    'register_models': function register_models(app_label, models) {
        var models = (type(models) == Array)?models:[models];
        for each (var model in models) {
            // Store as 'name: model' pair in a dictionary
            // in the app_models dictionary
            var model_name = model._meta.object_name.toLowerCase();
            var model_dict = this.app_models.setdefault(app_label, new SortedDict());
            if (model_dict.has_key(model_name))
                continue
            model_dict.set(model_name, model);
        }
    }
});

var cache = new AppCache();

$P({    'get_apps': getattr(cache, 'get_apps'),
        'get_app': getattr(cache, 'get_app'),
        'get_app_errors': getattr(cache, 'get_app_errors'),
        'get_models': getattr(cache, 'get_models'),
        'get_model': getattr(cache, 'get_model'),
        'register_models': getattr(cache, 'register_models'),
        'load_app': getattr(cache, 'load_app'),
        'app_cache_ready': getattr(cache, 'app_cache_ready') });