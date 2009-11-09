require('doff.core.exception', 'ImproperlyConfiguredException');
require('doff.core.project', 'get_settings');

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
var SeverWins = type('ClientWins', [ SyncMiddleware ], {

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