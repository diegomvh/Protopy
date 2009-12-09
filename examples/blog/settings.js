// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.
{
    DEBUG: true,
    TEMPLATE_DEBUG: this.DEBUG,

    PROJECT_NAME: 'Simple Blog',
    
    //Database
    DATABASE_ENGINE: 'gears',
    DATABASE_NAME: 'blog_sqlite.db',
    DATABASE_OPTIONS: {},
    
    //Store
    STORE_ENGINE: 'gears',
    STORE_NAME: 'agenda_store',
    MANIFEST_FILE: '/manifest.json',
    
    MEDIA_URL: '/blog/media/',

    ROOT_URLCONF: 'blog.urls',

    INSTALLED_APPS: [
        'agenda.apps.contactos',
        'agenda.apps.tareas'
    ],

    TOOLBAR_CLASSES: [
             'doff.utils.toolbars.status.Status',
             'doff.utils.toolbars.dbquery.DataBaseQuery',
             'doff.utils.toolbars.logger.Logger',
        ],
        
    TEMPLATE_CONTEXT_PROCESSORS: [
	         'doff.core.context_processors.debug',
	         'doff.core.context_processors.media',
	         'doff.core.context_processors.request'
	    ],
	
	TEMPLATE_URL: [ '/blog/templates/' ],
	
    TEMPLATE_LOADERS: [
                'doff.template.loaders.url.load_template_source'
            ]
}