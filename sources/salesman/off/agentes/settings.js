// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.
{
    DEBUG: true,
    TEMPLATE_DEBUG: this.DEBUG,
    
    //Network Check
    NETWORK_CHECK_URL: '/off/agentes/network_check',
    
    // Data for offline app
    PROJECT_NAME: 'Vendedor Viajante',
    PROJECT_DESCRIPTION: 'Desconecte la aplicación para poder usarla sin estar conectado a la red.',
    PROJECT_IMAGE: '/static/offline/protopy.png',
    LOADING_SPLASH: '/static/offline/loading.html',
    
    //Database
    DATABASE_ENGINE: 'gears',
    DATABASE_NAME: 'agentes_sqlite.db',
    DATABASE_OPTIONS: {},

    //Store
    STORE_ENGINE: 'gears',
    STORE_NAME: 'agentes_store',
    MANIFEST_FILE: '',
    
    MEDIA_URL: '/static/',

    ROOT_URLCONF: 'agentes.urls',

    INSTALLED_APPS: [
        'doff.contrib.extradata',
        'doff.contrib.offline',
        'agentes.ventas',
        'agentes.core'
    ],

    TOOLBAR_CLASSES: [
             'doff.utils.toolbars.status.Status',
             'doff.utils.toolbars.dbquery.DataBaseQuery',
             'doff.utils.toolbars.logger.Logger',
             'doff.contrib.offline.toolbar.Sync'
        ],
        
    TEMPLATE_CONTEXT_PROCESSORS: [
	         'doff.core.context_processors.auth',
	         'doff.core.context_processors.debug',
	         'doff.core.context_processors.media',
	         'doff.core.context_processors.request',
	         'doff.contrib.offline.context_processors.offline',
	         'agentes.context_processors.pedido'
	    ],
	
	SYNC_MIDDLEWARE_CLASS: 'doff.middleware.sync.ClientWinsMiddleware',
	RPC_PROTOCOL: 'JSON-RPC', //default: JSON-RPC or XML-RPC
    RPC_URL: '/off/agentes/jsonrpc/',
    
	TEMPLATE_URL: ['/off/agentes/templates/'],
	
    TEMPLATE_LOADERS: [
                'doff.template.loaders.url.load_template_source'
            ]
}