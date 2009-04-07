{
'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': 'blodg.db',
'DATABASE_USER': '',
'DATABASE_PASSWORD': '',
'DATABASE_HOST': '',
'DATABASE_PORT': '',
'DATABASE_OPTIONS': {},

'MEDIA_URL': '/medios/',

'ROOT_URLCONF': 'blog.urls',

'INSTALLED_APPS': [ 'blog.apps.post' ],

'TEMPLATE_DIRS': [ '/tesis/blog/templates/' ],

'TEMPLATE_LOADERS': [
            'doff.template.loaders.remote.load_template_source',
            'doff.template.loaders.app_remote.load_template_source',
            //'doff.template.loaders.filesystem.load_template_source',
        ]
}