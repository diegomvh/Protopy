{
'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': 'blog.db',
'DATABASE_OPTIONS': {},

'MEDIA_URL': '/medios/',

'ROOT_URLCONF': 'blog.urls',

'INSTALLED_APPS': [ 'blog.apps.post' ],

'TEMPLATE_URL': '/doffline/templates/',

'TEMPLATE_STRING_IF_INVALID': '{{ No esta <strong>%s</strong> en el contexto }}',

'TEMPLATE_LOADERS': [
            'doff.template.loaders.url.load_template_source',
            'doff.template.loaders.app_url.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ]
}