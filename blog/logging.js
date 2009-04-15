{
    'auto_set_onModuleCreated': true,
    'loggers': {
        'root': {
            'level': 'CRITICAL',
            'handlers': 'firebug'
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
            'formatter': '%(time)s %(name)s(%(levelname)s): %(message)s',
            'args': []
        }
    }
}