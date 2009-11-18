require('doff.db.base', 'connection');

var TransactionManagementError = type('TransactionManagementError', [ Exception ]);

var state = null;
var savepoint_state = null;
var dirty = null;

function enter_transaction_management(managed) {
    state = [false];
    dirty = false;
    connection._enter_transaction_management(managed || true);
    begin();
}

function leave_transaction_management() {
    connection._leave_transaction_management(is_managed());
    state.pop();
    if (dirty) {
        rollback();
        throw new TransactionManagementError("Transaction managed block ended with pending COMMIT/ROLLBACK");
    }
    dirty = false;
}

function is_dirty() { 
    return dirty || false;
}

function set_dirty() {
    dirty = true;
}

function set_clean() {
    dirty = false;
    clean_savepoints();
}

function clean_savepoints() {
    savepoint_state = null;
}

function is_managed() {
    if (bool(state))
        return state.slice(-1)[0];
    return false;
}

function managed(flag) {
    flag = isundefined(flag)? true : flag;
    if (bool(state)) {
        state[len(state) - 1] = flag;
        if (!flag && is_dirty()) {
            connection._commit();
            set_clean();
        }
    } else {
        throw new TransactionManagementError("This code isn't under transaction management");
    }
}

function commit_unless_managed() {
    if (!is_managed())
        connection._commit();
     else
        set_dirty();
}

function rollback_unless_managed() {
    if (!is_managed())
        connection._rollback();
    else
        set_dirty();
}

function commit() {
    connection._commit();
    set_clean();
}

function rollback() {
    connection._rollback();
    set_clean();
}

function begin() {
    connection._begin();
    set_clean();
}

// DECORATORS
var autocommit = function() {};
var commit_on_success = function() {};
var commit_manually = function() {};

publish({
    enter_transaction_management: enter_transaction_management,
    leave_transaction_management: leave_transaction_management,
    is_dirty: is_dirty,
    set_dirty: set_dirty,
    set_clean: set_clean,
    clean_savepoints: clean_savepoints,
    is_managed: is_managed,
    managed: managed,
    commit_unless_managed: commit_unless_managed,
    rollback_unless_managed: rollback_unless_managed,
    commit: commit,
    rollback: rollback,
    autocommit: autocommit,
    commit_on_success: commit_on_success,
    commit_manually: commit_manually
});