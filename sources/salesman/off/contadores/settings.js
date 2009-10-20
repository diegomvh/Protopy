// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.

{
    'DEBUG': true,
    'TEMPLATE_DEBUG': this.DEBUG,

    //Database
    'DATABASE_ENGINE': 'gears',
    'DATABASE_NAME': 'contadores_sqlite.db',
    'DATABASE_OPTIONS': {},


    
    'MEDIA_URL': '',

    'ROOT_URLCONF': 'contadores.urls',


    'INSTALLED_APPS': [ 
        'doff.contrib.offline'
    ],


    'TEMPLATE_URLS': [ 
        'trabajo_offline/templates/' 
    ],
                    

    'TEMPLATE_LOADERS': [
        'doff.template.loaders.url.load_template_source'
    ]
}

