require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

//http://www.comesfa.org/es/node/14805

var DataBaseQuery = type('DataBaseQuery', Panel, {
    __init__: function() {
        super(Panel, this).__init__('dbquery', 'Query Tool');
        this.current_command_index = 0;
        this.command_history = [];
	//Black magic, the first time init the db
	this.execute_sql = this.init_db;
    },

    get_template: function() {
        var file = sys.module_url('doff.utils', 'resources/dbquery.html');
        var template = '';
        new ajax.Request(file, {
            method: 'GET',
	    asynchronous : false,
	    onSuccess: function(transport) {
		template = transport.responseText;
	    },
	    onException: function(obj, exception) {
		throw exception;
	    },
	    onFailure: function(transport) {
		throw new Exception("No template for dbquery");
	    }
	});
        return template;
    },

    _display: function() {
        this.render(this.get_template());
        var self = this;

        this.text_sql = $('dbquery-sql');
        event.connect(this.text_sql, 'keydown', function(e) {
            if (e.keyCode == event.keys['UP_ARROW'] && self.is_cursor_on_first_line()) {
                return self.previous_command();
            } else if (e.keyCode == event.keys['DOWN_ARROW'] && self.is_cursor_on_last_line()) {
                return self.next_command();
            } else if (e.keyCode == event.keys['ENTER']) {
                if (!e.shiftKey && !e.ctrlKey) {
                    self.execute();
                    return false;
                }
            }
        });
	this.text_sql.value = 'select * from sqlite_master';

        this.bt_execute = $('dbquery-execute');
        event.connect(this.bt_execute, 'click', getattr(this, 'execute'));

	this.bt_clear = $('dbquery-clear');
	event.connect(this.bt_clear, 'click', function(event) {
	    self.output.update('');
	    self.text_sql.value = '';
	    self.text_sql.focus();
	});
	this.output = $('output');
    },

    is_cursor_on_first_line: function() {
        if (type(this.text_sql.selectionStart) == Number) {
            var index = this.text_sql.value.indexOf('\n');
            return index == -1 || this.text_sql.selectionStart <= index;
        } else {
            // Get the range representing the text before the cursor. Then get the
            // number of rects that is and see if we have more than one
            var selectionRange = document.selection.createRange();
            var range = selectionRange.duplicate();
            range.moveToElementText(this.text_sql);
            range.setEndPoint('EndToStart', selectionRange);
            return range.getClientRects().length == 1;
        }
    },


    is_cursor_on_last_line: function() {
        if (typeof this.text_sql.selectionEnd == 'number') {
            var index = this.text_sql.value.substr(this.text_sql.selectionEnd).indexOf('\n');
            return index == -1;
        } else {
            // Get the range representing the text before the cursor. Then get the
            // number of rects that is and see if we have more than one
            var selectionRange = document.selection.createRange();
            var range = selectionRange.duplicate();
            range.moveToElementText(this.text_sql);
            range.setEndPoint('StartToEnd', selectionRange);
            return range.getClientRects().length == 1;
        }
    },

    /**
     * Changes the value of the textarea to the next command
     */
    previous_command: function() {
        if (this.current_command_index > 0) {
            this.command_history[this.current_command_index] = this.text_sql.value;
            this.current_command_index--;
            this.text_sql.value = this.command_history[this.current_command_index];
            return false;
        }
    },

    /**
     * Changes the value of the textarea to the next command
     */
    next_command: function() {
        if (this.current_command_index < len(this.command_history) - 1) {
            this.command_history[this.current_command_index] = this.text_sql.value;
            this.current_command_index++;
            this.text_sql.value = this.command_history[this.current_command_index];
            return false;
        }
    },

    execute: function(){
        var val = this.text_sql.value.replace(/(^\s+)|(\s+$)/g, '');
        if (val) {
            this.add(val);
            this.execute_sql(val);
            this.text_sql.value = '';
            this.text_sql.focus();
        }
    },

    add: function(val) {
        if (this.command_history[this.command_history.length - 1] == '') {
            this.command_history[this.command_history.length - 1] = val;
        } else if (val != this.command_history[this.command_history.length - 1]) {
            this.command_history.push(val);
        }
        this.current_command_index = this.command_history.length;
    },

    init_db: function(val) {
	require('doff.db.base', 'connection');
	this.db = connection.connection;
	this.execute_sql = this.execute_and_print;
	return this.execute_sql(val);
    },
    
    execute_and_print: function(sql) {
	var rs, error = false, errorMessage;
	try {
	    rs = this.db.execute(sql);
	} catch (ex) {
	    error = true;
	    errorMessage = ex.message || ex.description || String(ex);
	}

	var sb = [];
	sb.push('<h3>', sql.escapeHTML(), '</h3>');
	sb.push('<table cellspacing=0><thead><tr>');
	if (!rs || error) {
	    sb.push('<th>Error</th><thead><tbody><tr><td>', errorMessage || 'Unknown error', '</td></tr>');

	// If we did an update, insert, delete etc. we would not have a valid row
	} else if (rs.isValidRow()) {

	    // headers
	    cols = rs.fieldCount()
	    for (i = 0; i < cols; i++) {
		sb.push('<th>', str(rs.fieldName(i)).escapeHTML(), '</th>');
	    }
	    sb.push('</tr></thead><tbody>');

	    var odd = true;
	    while (rs.isValidRow()) {
	    sb.push('<tr ' + (odd ? 'class="odd"' : '') + '>');
		for (i = 0; i < cols; i++) {
		sb.push('<td>', str(rs.field(i)).escapeHTML(), '</td>');
	    }
	    odd = !odd;
	    sb.push('</tr>');
	    rs.next();
	    }
	    rs.close();
	}
	sb.push('</tbody></table>');
	this.output.update(sb.join(''));
    }
});

publish({
    DataBaseQuery: DataBaseQuery
});