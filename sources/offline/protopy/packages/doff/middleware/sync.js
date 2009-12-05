require('doff.core.exceptions', 'ImproperlyConfiguredException');
require('doff.conf.settings', 'settings');

var SyncMiddleware = type('SyncMiddleware', [ object ], {
    /**
     * Bajo nivel
     */
    resolve_conflict: function(exception, local_object, deserialized_object) {
        var f = getattr(this, 'resolve_%s'.subs( exception.__name__));
        if (!callable(f)) {
            throw new ImproperlyConfiguredException("%s doesnt handle %s properly".subs(
                    this.__name__,
                    exception.__name__));
        }
        return f(local_object, deserialized_object);
    },

    // Posiblemente tomar el pk del server y ponerlo en la local
    resolve_UniqueDataBaseObject: function(local_object, deserialized_object) {
        throw new NotImplementedError();
    },

    // Posiblemente tomar la local y ponerla como sync
    reoslve_LocalDeletedRemoteModified: function(local_object, deserialized_object) {
        throw new NotImplementedError();
    },

    // Selecciona una de las dos
    resolve_LocalModifiedRemoteModified: function(local_object, deserialized_object) {
        throw new NotImplementedError();
    },

    
    reoslve_LocalModifiedRemoteDeleted: function(local_object, deserialized_object) {
        throw new NotImplementedError();
    },

    before_push: function(data) {},

    after_push: function(data) {},

    before_pull: function(data) {},

    after_pull: function(data) {},

    after_merge: function (auto, local_object, remote_object) {

    }
});

var ClientWinsMiddleware = type('ClientWinsMiddleware', [ SyncMiddleware ], {

    resolve_UniqueDataBaseObject: function(local_object, deserialized_object) {
        return local_object;
    },

    reoslve_LocalDeletedRemoteModified: function(local_object, deserialized_object) {
        return local_object;
    },

    resolve_LocalModifiedRemoteModified: function(local_object, deserialized_object) {
        return local_object;
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, deserialized_object) {
        return local_object;
    }
});

var SeverWinsMiddleware = type('SeverWinsMiddleware', [ SyncMiddleware ], {

    resolve_UniqueDataBaseObject: function(local_object, deserialized_object) {
        return remote_object;
    },

    reoslve_LocalDeletedRemoteModified: function(local_object, deserialized_object) {
        return remote_object;
    },

    resolve_LocalModifiedRemoteModified: function(local_object, deserialized_object) {
        return remote_object;
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, deserialized_object) {
        return remote_object;
    }
});

publish({ 
    SyncMiddleware:SyncMiddleware,
    ClientWinsMiddleware: ClientWinsMiddleware,
    SeverWinsMiddleware: SeverWinsMiddleware
});