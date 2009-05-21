// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.

{
'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': '{{ project_name }}_sqlite.db',
'DATABASE_USER': '',
'DATABASE_PASSWORD': '',
'DATABASE_HOST': '',
'DATABASE_PORT': '',
'DATABASE_OPTIONS': {},



{# Aca tenemos que meter la URL de los medios #}
'MEDIA_URL': '{{ settings.MEDIA_URL }}',

'ROOT_URLCONF': '{{ project_name }}.urls',


'INSTALLED_APPS': [ 
                    
                    'blog.apps.post' 
                    
                    ],

'TEMPLATE_URLS': [ '/blog/templates/' ],

'TEMPLATE_STRING_IF_INVALID': '{ { No esta <strong>%s</strong> en el contexto } }',

'TEMPLATE_LOADERS': [
            'doff.template.loaders.url.load_template_source',
            'doff.template.loaders.app_url.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ]
}

