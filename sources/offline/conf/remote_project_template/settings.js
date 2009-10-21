// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.

{
    'DEBUG': true,
    'TEMPLATE_DEBUG': this.DEBUG,

    //Database
    'DATABASE_ENGINE': 'gears',
    'DATABASE_NAME': '{{ remote_name }}_sqlite.db',
    'DATABASE_OPTIONS': {},


    {# Aca tenemos que meter la URL de los medios #}
    'MEDIA_URL': '{{ settings.MEDIA_URL }}',

    'ROOT_URLCONF': '{{ remote_name}}.urls',


    'INSTALLED_APPS': [ 
        'doff.contrib.offline'
    ],

    'TEMPLATE_URLS': [ 
        '{{ settings.OFFLINE_BASE }}/templates/' 
    ],

    'TEMPLATE_LOADERS': [
        'doff.template.loaders.url.load_template_source'
    ]
}

