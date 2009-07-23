{

'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

'PROJECT_NAME': 'El blog',
'PROJECT_DESCRIPTION': 'Este es un ejemplo de un blog, creado para desarrollar un engendro demoniaco llamado doff',
'PROJECT_IMAGE': '/static/weeds.png',

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': 'blog.db',
'DATABASE_OPTIONS': {},

'MEDIA_URL': '/static/',

'ROOT_URLCONF': 'blog.urls',

'INSTALLED_APPS': [ 'blog.post' ],

'TEMPLATE_URL': '/doffline/blog/templates/',

'TEMPLATE_STRING_IF_INVALID': '{{ No esta <strong>%s</strong> en el contexto }}',

'TEMPLATE_LOADERS': [
            'doff.template.loaders.url.load_template_source',
            //'doff.template.loaders.app_url.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ]
}