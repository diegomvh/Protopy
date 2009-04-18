{
    'loggers': {
        'root': {
            'level': 'CRITICAL',
            'handlers': 'alert'
        },
        'doff.db.models.sql': {
            'level':'DEBUG',
            'handlers':'firebug',
            'propagate': false
        },
        'doff.db.backends.gears': {
            'level':'DEBUG',
            'handlers':'firebug',
            'propagate': false
        },
    },
    'handlers': {
        'firebug': {
            'class': 'FirebugHandler',
            'level':'DEBUG',
            'formatter': '%(time)s %(name)s(%(levelname)s):\n%(message)s',
            'args': []
        },
	'alert': {
            'class': 'AlertHandler',
            'level':'DEBUG',
            'formatter': '%(levelname)s:\n%(message)s',
            'args': []
        }
    }
}