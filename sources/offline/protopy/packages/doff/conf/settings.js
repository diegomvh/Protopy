var global_settings = {
        DEBUG: false,
        TEMPLATE_DEBUG: false,

        // Database connection info.
        DATABASE_ENGINE: 'gears',
        DATABASE_NAME: '',
        DATABASE_OPTIONS: {},

        //SESSION
        SESSION_COOKIE_NAME: 'doffsessionid';                       // Cookie name. This can be whatever you want.
        SESSION_COOKIE_AGE: 60 * 60 * 24 * 7 * 2;               // Age of cookie, in seconds (default: 2 weeks).
        SESSION_COOKIE_DOMAIN: null;                            // A string like ".lawrence.com", or None for standard domain cookie.
        SESSION_COOKIE_SECURE: false;                           // Whether the session cookie should be secure (https:// only).
        SESSION_COOKIE_PATH: '/';                               // The path of the session cookie.
        SESSION_SAVE_EVERY_REQUEST: false;                      // Whether to save the session data on every request.
        SESSION_EXPIRE_AT_BROWSER_CLOSE: false;                 // Whether a user's session cookie expires when the Web browser is closed.
        SESSION_FILE_PATH: null; 								// Directory to store session files if using
        
        // List of strings representing installed apps.
        INSTALLED_APPS: [],

        // Location of the template source files.
        TEMPLATE_URL: '',

        // List of callables that know how to import templates from various sources.
        TEMPLATE_LOADERS: [
            'doff.template.loaders.url.load_template_source',
            //'doff.template.loaders.remote_app.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ],

        // Whether to append trailing slashes to URLs.
        APPEND_SLASH: true,

        // List of processors used by RequestContext to populate the context.
        // Each one should be a callable that takes the request object as its
        // only parameter and returns a dictionary to add to the context.
        TEMPLATE_CONTEXT_PROCESSORS: [
            'doff.core.context_processors.debug',
            'doff.core.context_processors.media',
            'doff.core.context_processors.request',
            'doff.contrib.offline.context_processors.offline'
        ],

        TOOLBAR_CLASSES: [
             'doff.utils.toolbars.status.Status',
             'doff.utils.toolbars.dbquery.DataBaseQuery',
             'doff.utils.toolbars.logger.Logger'
        ],

        TEMPLATE_STRING_IF_INVALID: '',

        SYNC_MIDDLEWARE_CLASS: 'doff.middleware.sync.SyncMiddleware',

        MIDDLEWARE_CLASSES: [
            'doff.middleware.common.CommonMiddleware',
            'doff.contrib.sessions.middleware.SessionMiddleware',
            'doff.contrib.auth.middleware.AuthenticationMiddleware',
        ],

        //The tablespaces to use for each model when not specified otherwise.
        DEFAULT_TABLESPACE: '',
        DEFAULT_INDEX_TABLESPACE: ''
}

var Settings = type ('Settings', [ object ],
    __init__: function(settings_module) {
        // update this dict from global settings (but only for ALL_CAPS settings)
        for (var setting in global_settings)
            if (setting == setting.toUpperCase())
                this[setting] = global_settings[setting];

         store the settings module in case someone later cares
        this.SETTINGS_MODULE = settings_module;

        try:
            mod = __import__(self.SETTINGS_MODULE, {}, {}, [''])
        except ImportError, e:
            raise ImportError, "Could not import settings '%s' (Is it on sys.path? Does it have syntax errors?): %s" % (self.SETTINGS_MODULE, e)

        # Settings that should be converted into tuples if they're mistakenly entered
        # as strings.
        tuple_settings = ("INSTALLED_APPS", "TEMPLATE_DIRS")

        for setting in dir(mod):
            if setting == setting.upper():
                setting_value = getattr(mod, setting)
                if setting in tuple_settings and type(setting_value) == str:
                    setting_value = (setting_value,) # In case the user forgot the comma.
                setattr(self, setting, setting_value)

        // Expand entries in INSTALLED_APPS like "django.contrib.*" to a list of all those apps.
        new_installed_apps = []
        for app in self.INSTALLED_APPS:
            if app.endswith('.*'):
                appdir = os.path.dirname(__import__(app[:-2], {}, {}, ['']).__file__)
                app_subdirs = os.listdir(appdir)
                app_subdirs.sort()
                for d in app_subdirs:
                    if d.isalpha() and os.path.isdir(os.path.join(appdir, d)):
                        new_installed_apps.append('%s.%s' % (app[:-2], d))
            else:
                new_installed_apps.append(app)
        this.INSTALLED_APPS = new_installed_apps

        if hasattr(time, 'tzset'):
            // Move the time zone info into os.environ. See ticket #2315 for why
            // we don't do this unconditionally (breaks Windows).
            os.environ['TZ'] = self.TIME_ZONE
            time.tzset()
	},
	
    get_all_members: function() {
        return keys(this);
    }
});
        
var settings = (function() { 
		require('doff.core.project', 'get_project');
		var project = get_project();
		var url_settings = sys.module_url(project.package, 'settings.js');
    	return new Settings })();


get settings() {
        if (this._settings)
            return this._settings;
        var self = this;
        var global_settings = require('doff.conf.settings');
        var url_settings = sys.module_url(this.package, 'settings.js');
        new ajax.Request(url_settings, {
            method: 'GET',
            asynchronous : false,
            onSuccess: function(transport) {
                var code = '(' + transport.responseText + ');';
                var project_settings = eval(code);
                self._settings = extend(global_settings, project_settings);
            },
            onException: function(obj, exception) {
                throw exception;
            },
            onFailure: function(transport) {
                throw new Exception("No settings");
            }
        });
        return this._settings;
    },
    
publish({
	settings: settings
});