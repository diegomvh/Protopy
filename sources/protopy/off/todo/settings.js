{

'DEBUG': true,
'TEMPLATE_DEBUG': this.DEBUG,

'PROJECT_NAME': 'El blog',
'PROJECT_DESCRIPTION': 'Este es un ejemplo de un blog, creado para desarrollar un engendro demoniaco llamado doff',
'PROJECT_IMAGE': '/static/weeds.png',

//Database
'DATABASE_ENGINE': 'gears',
'DATABASE_NAME': 'todo.db',
'DATABASE_OPTIONS': {},

'MEDIA_URL': '/static/',

'ROOT_URLCONF': 'todo.urls',

'INSTALLED_APPS': [
    'todo.post' 
]
}