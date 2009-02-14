(function(){

    return {
        class_prepared: new Event.Custom("class_prepared", this),
        pre_init: new Event.Custom("pre_init", this),
        post_init: new Event.Custom("post_init", this),
        pre_save: new Event.Custom("pre_save", this),
        post_save: new Event.Custom("post_save", this),
        pre_delete: new Event.Custom("pre_delete", this),
        post_delete: new Event.Custom("post_delete", this),
        post_syncdb: new Event.Custom("post_syncdb", this)
    };

})();

