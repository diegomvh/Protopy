require('doff.core.urlresolvers');
require('doff.core.exception', 'ImproperlyConfiguredException');
require('doff.core.project', 'get_settings');

var settings = get_settings();

var SyncMiddleware = type('SyncMiddleware', [ object ], {
    /**
     * Bajo nivel
     */
    resolve_conflict: function(exception, local_model, remote_model) {
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
		return f(local_model, remote_model);
    },
    
    resolve_unique: null,
    reoslve_LDelRMod: null,
    resolve_LModRMod: null,
    reoslve_LModRDel: null,
    
    /* Default behaviour */
    
    server_wins: function () {
    	
    },
    client_wins: function () {
    	
    },
    user_assisted: function () {
    	/* Usar panel de sincronización */
    },
    
    before_push: function(request, response) {
        return response;
    },
    after_push: function(request, response) {
        return response;
    },
    
    before_pull: function(request, response) {
        return response;
    },
    after_pull: function(request, response) {
        return response;
    },
    after_merge: function (auto, local_model, remote_model) {
    	
    }
});

var ClientWins = {};
var SeverWins = {};
var UserAssited = {};