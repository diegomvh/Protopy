publish({
        DEBUG: false,
        TEMPLATE_DEBUG: false,

        // Database connection info.
        DATABASE_ENGINE: 'gears',
        DATABASE_NAME: '',
        DATABASE_OPTIONS: {},

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
            'doff.core.context_processors.offline'
        ],

        TEMPLATE_STRING_IF_INVALID: '',

        MIDDLEWARE_CLASSES: [
            'doff.middleware.common.CommonMiddleware',
            'doff.contrib.auth.middleware.AuthenticationMiddleware',
            //'doff.contrib.sessions.middleware.SessionMiddleware',
        ],

        //The tablespaces to use for each model when not specified otherwise.
        DEFAULT_TABLESPACE: '',
        DEFAULT_INDEX_TABLESPACE: ''
});