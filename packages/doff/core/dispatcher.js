$L('doff.utils.set', 'Set');

var Signal = Class('Signal', {
    __init__: function(name, scope) {
        this.name = name;
        this.scope = scope;
        this.allEvents = null;
    },

    /**
     * Attaches a {handler} function for execution upon the event firing
     * @param {Function} handler
     * @param {Boolean} asynchFlag [optional] Defaults to false if omitted. Indicates whether to execute {handler} asynchronously (true) or not (false).
     */
    connect: function(handler) {
        //create a custom object containing the handler method and the asynch flag
    if (this.allEvents == null)
        this.allEvents = [];
        var asynchVar = arguments.length > 2 ? arguments[2] : false;
        var handlerObj = {
            method: handler,
            asynch: asynchVar
        };
        this.allEvents.push(handlerObj);
    },

    /**
     * Removes a single handler
     * @param {Function} handler A reference to the handler function to un-register from the event
     */
    disconnect: function(handler) {
        if (this.allEvents != null)
        this.allEvents = this.allEvents.reject(function(obj) { return obj.method == handler; });
    },

    /**
     * Removes all handlers
     */
    clear: function() {
        this.allEvents = null;
    },

   /**
     * Fires the event {eventName}, resulting in all registered handlers to be executed.
     * @params {Object} args [optional] Any object, will be passed into the handler function as the only argument
     */
    send: function() {
        if (this.allEvents != null) {
            var len = this.allEvents.length; //optimization
            for (var i = 0; i < len; i++) {
                try {
                    if (arguments.length > 0) {
                        if (this.allEvents[i].asynch) {
                            var eventArgs = arguments[0];
                            var method = this.allEvents[i].method.bind(this);
                            setTimeout(function() { method(eventArgs) }.bind(this), 10);
                        } else
                            this.allEvents[i].method(arguments[0]);
                    } else {
                        if (this.allEvents[i].asynch) {
                            var eventHandler = this.allEvents[i].method;
                            setTimeout(eventHandler, 1);
                        }
                        else
                            if (this.allEvents && this.allEvents[i] && this.allEvents[i].method)
                                this.allEvents[i].method();
                    }
                } catch (e) {
                if (this.id)
                    alert("error: error in " + this.id + ".fire():\n\nerror message: " + e.message);
                else
                    alert("error: error in [unknown object].fire():\n\nerror message: " + e.message);
                }
            }
        }
    }
});

$P({'Signal':Signal});