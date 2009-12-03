// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.
{
    DEBUG: true,
    TEMPLATE_DEBUG: this.DEBUG,
    
    // Data for offline app
    PROJECT_NAME: 'Vendedor Viajante',
    PROJECT_DESCRIPTION: 'Desconecte la aplicación para poder continuar levantando</br>pedidos sin estar conectado a la red de redes',
    PROJECT_IMAGE: '/static/offline/protopy.png',
    LOADING_SPLASH: '/static/offline/loading.html',
    
    //Database
    DATABASE_ENGINE: 'gears',
    DATABASE_NAME: 'agentes_sqlite.db',
    DATABASE_OPTIONS: {},

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

    TEMPLATE_LOADERS: [
                'doff.template.loaders.url.load_template_source'
            ]
}