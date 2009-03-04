$L('doff.core.dispatcher', 'Signal');

/*
$P({    class_prepared: new Signal("class"),
        pre_init: new Signal("instance", "args", "kwargs"),
        post_init: new Signal("instance"),
        pre_save: new Signal("instance", "raw"),
        post_save: new Signal("instance", "raw", "created"),
        pre_delete: new Signal("instance"),
        post_delete: new Signal("instance"),
        post_syncdb: new Signal("class", "app", "created_models", "verbosity", "interactive")
    });
*/
$P({    'class_prepared': new Signal("class_prepared", this),
        'pre_init': new Signal("pre_init", this),
        'post_init': new Signal("post_init", this),
        'pre_save': new Signal("pre_save", this),
        'post_save': new Signal("post_save", this),
        'pre_delete': new Signal("pre_delete", this),
        'post_delete': new Signal("post_delete", this),
        'post_syncdb': new Signal("post_syncdb", this)
    });