require('doff.db.transaction');

var TransactionMiddleware = type('TransactionMiddleware', [ object ], {
    process_request: function (request) {
        //Enters transaction management
        transaction.enter_transaction_management();
        transaction.managed(true);
    },

    process_exception: function (request, exception) {
        //Rolls back the database and leaves transaction management
        if (transaction.is_dirty())
            transaction.rollback();
        transaction.leave_transaction_management();
    },

    process_response: function (request, response) {
        //Commits and leaves transaction management.
        if (transaction.is_managed()) {
            if (transaction.is_dirty())
                transaction.commit();
            transaction.leave_transaction_management();
        }
        return response;
    }
});

publish({
    TransactionMiddleware: TransactionMiddleware
});