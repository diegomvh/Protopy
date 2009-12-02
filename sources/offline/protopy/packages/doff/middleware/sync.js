require('doff.core.exceptions', 'ImproperlyConfiguredException');
require('doff.conf.settings', 'settings');

var SyncMiddleware = type('SyncMiddleware', [ object ], {
    /**
     * Bajo nivel
     */
    resolve_conflict: function(exception, local_object, remote_object) {
        // Hacer algo con el 
        // * UniqueConstraint (DB)
        // * LDelRMod
        // * LModRMod
        // * LModRDel
        var f = getattr(this, 'resolve_%s'.subs( exception.__name__));
        if (!callable(f)) {
            throw new ImproperlyConfiguredException("%s doesnt handle %s properly".subs(
                    this.__name__,
                    exception.__name__));
        }
        return f(local_object, remote_object);
    },

    // Posiblemente tomar el pk del server y ponerlo en la local
    resolve_unique: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    // Posiblemente tomar la local y ponerla como sync
    reoslve_LocalDeletedRemoteModified: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    // Selecciona una de las dos
    resolve_LocalModifiedRemoteModified: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    
    reoslve_LocalModifiedRemoteDeleted: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    before_push: function(data) {
        return data;
    },

    after_push: function(data) {
        return data;
    },

    before_pull: function(data) {
        return data;
    },

    after_pull: function(data) {
        return data;
    },

    after_merge: function (auto, local_object, remote_object) {

    }
});

var ClientWins = type('ClientWins', [ SyncMiddleware ], {

    resolve_Unique: function(local_object, remote_object) {
        print("Gana el cliente");
        return local_object;
    },

    reoslve_LocalDeletedRemoteModified: function(local_object, remote_object) {
        print("Gana el cliente");
        return local_object;
    },

    resolve_LocalModifiedRemoteModified: function(local_object, remote_object) {
        print("Gana el cliente");
        return local_object;
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, remote_object) {
        print("Gana el cliente");
        return local_object;
    },


});
var SeverWins = type('ClientWins', [ SyncMiddleware ], {

    resolve_unique: function(local_object, remote_object) {
        print("Gana el servidor");
        return remote_object;
    },

    reoslve_LocalDeletedRemoteModified: function(local_object, remote_object) {
        print("Gana el servidor");
        return remote_object;
    },

    resolve_LocalModifiedRemoteModified: function(local_object, remote_object) {
        print("Gana el servidor");
        return remote_object;
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, remote_object) {
        print("Gana el servidor");
        return remote_object;
    },


});
var UserAssited = type('ClientWins', [ SyncMiddleware ], {

    resolve_unique: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    reoslve_LocalDeletedRemoteModified: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    resolve_LocalModifiedRemoteModified: function(local_object, remote_object) {
        throw new NotImplementedError();
    },

    reoslve_LocalModifiedRemoteDeleted: function(local_object, remote_object) {
        throw new NotImplementedError();
    },


});

publish({ 
    SyncMiddleware:SyncMiddleware,
    ClientWins: ClientWins,
    SeverWins: SeverWins,
    UserAssited: UserAssited
});