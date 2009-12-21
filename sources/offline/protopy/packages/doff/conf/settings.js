var global_settings = {
    DEBUG: false,
    TEMPLATE_DEBUG: false,
    
    // Network Check, if is '' do not network check
    NETWORK_CHECK_URL: '',
    NET_CHECK: 5,

    // Database connection info.
    DATABASE_ENGINE: 'gears',
    DATABASE_NAME: '',
    DATABASE_OPTIONS: {},

    // Store
    STORE_ENGINE: 'gears',
    STORE_NAME: '',
    MANIFEST_FILE: '',
    
    // SESSION
    SESSION_COOKIE_NAME: 'doffsessionid',                       // Cookie name. This can be whatever you want.
    SESSION_COOKIE_AGE: 60 * 60 * 24 * 7 * 2,               // Age of cookie, in seconds (default: 2 weeks).
    SESSION_COOKIE_DOMAIN: null,                            // A string like ".lawrence.com", or None for standard domain cookie.
    SESSION_COOKIE_SECURE: false,                           // Whether the session cookie should be secure (https:// only).
    SESSION_COOKIE_PATH: '/',                               // The path of the session cookie.
    SESSION_SAVE_EVERY_REQUEST: false,                      // Whether to save the session data on every request.
    SESSION_EXPIRE_AT_BROWSER_CLOSE: false,                 // Whether a user's session cookie expires when the Web browser is closed.
    SESSION_FILE_PATH: null, 								// Directory to store session files if using
    
    // List of strings representing installed apps.
    INSTALLED_APPS: [],

    // Location of the template source files.
    TEMPLATE_URL: [ '' ],

    // List of callables that know how to import templates from various sources.
    TEMPLATE_LOADERS: [
        'doff.template.loaders.url.load_template_source',
        //'doff.template.loaders.app_url.load_template_source',
    ],

    // Whether to append trailing slashes to URLs.
    APPEND_SLASH: true,

    // List of processors used by RequestContext to populate the context.
    // Each one should be a callable that takes the request object as its
    // only parameter and returns a dictionary to add to the context.
    TEMPLATE_CONTEXT_PROCESSORS: [
        'doff.core.context_processors.auth',
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

    // Offline contrib
    SYNC_MIDDLEWARE_CLASS: 'doff.middleware.sync.SyncMiddleware',
    RPC_PROTOCOL: 'JSON-RPC', //JSON-RPC or XML-RPC,  default: JSON-RPC
    RPC_URL: '',

    // logging Config file
    LOGGING_CONFIG_FILE: '',

    MIDDLEWARE_CLASSES: [
        'doff.middleware.common.CommonMiddleware',
        'doff.contrib.session.middleware.SessionMiddleware',
        'doff.contrib.auth.middleware.AuthenticationMiddleware',
    ],

    //The tablespaces to use for each model when not specified otherwise.
    DEFAULT_TABLESPACE: '',
    DEFAULT_INDEX_TABLESPACE: ''
};

var Settings = type ('Settings', [ object ], {
    __init__: function(settings_module, file) {
		this.SETTINGS_FILE = file;
        for (var setting in global_settings)
            if (setting == setting.toUpperCase())
                this[setting] = global_settings[setting];

        this.SETTINGS_MODULE = settings_module;

        for (var setting in settings_module)
            if (setting == setting.toUpperCase())
                this[setting] = settings_module[setting];
	},
	
    get_all_members: function() {
        return keys(this);
    }
});
        
var settings = (function() { 
	require('doff.core.project', 'get_project');
	var project = get_project();
	var url_settings = sys.module_url(project.package, 'settings.js');
	var project_settings = null;
	new ajax.Request(url_settings, {
        method: 'GET',
        asynchronous : false,
        onSuccess: function(transport) {
            project_settings = eval('(' + transport.responseText + ');');
        },
        onException: function(obj, exception) {
            throw exception;
        },
        onFailure: function(transport) {
            throw new Exception("No settings");
        }
    });
	if (project_settings == null)
		new Exception("No settings");
	return new Settings (project_settings, url_settings);
})();

publish({
	settings: settings
});