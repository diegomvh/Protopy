// DJANGO OFFLINE SETTINGS FILE
// Please note that Javascript is not Python. You must not end your lists nor
// dictionaries with semicolon.

{
'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': 'doffproj_sqlite.db',
'DATABASE_OPTIONS': {},



'MEDIA_URL': '/static/',

'ROOT_URLCONF': 'doffproj.urls',


'INSTALLED_APPS': [ 
                    
                     
                    
                    ],


'TEMPLATE_URLS': [ 
                   'doffline/templates/' 
                   ],
                   


'TEMPLATE_STRING_IF_INVALID': '{ { No esta <strong>%s</strong> en el contexto } }',

'TEMPLATE_LOADERS': [
            'doff.template.loaders.url.load_template_source',
            'doff.template.loaders.app_url.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ]
}

