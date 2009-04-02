$L('doff.template.*', 'Node', 'Variable', 'NodeList', 'Template');
$L('doff.template.*', 'TemplateSyntaxError', 'VariableDoesNotExist');
$L('doff.template.*', 'get_library', 'Library', 'InvalidTemplateLibrary');
$L('doff.template.context', 'Context');

var register = new Library();

var AutoEscapeControlNode = type('AutoEscapeControlNode', Node,{
    '__init__': function __init__(setting, nodelist) {
        this.setting = setting;
        this.nodelist = nodelist;
    },
    
    'render': function render(context) {
        var old_setting = context.autoescape;
        context.autoescape = this.setting;
        var output = this.nodelist.render(context);
        context.autoescape = old_setting;
        return output;
    }
});

var CommentNode = type('CommentNode', Node,{
    'render': function render(context) { return "";}
});

var ForNode = type('ForNode', Node,{
    '__init__': function __init__(loopvars, sequence, is_reversed, nodelist_loop){
        this.loopvars = loopvars;
        this.sequence = sequence;
        this.is_reversed = is_reversed;
        this.nodelist_loop = nodelist_loop;
    },

    'get_nodes_by_type': function get_nodes_by_type(nodetype) {
        var nodes = [];
        if (isinstance(this, nodetype))
            nodes.push(this);
        nodes = nodes.concat(this.nodelist_loop.get_nodes_by_type(nodetype));
        return nodes;
    },

        'render': function render(context) {
            var nodelist = new NodeList(),
                parentloop = null,
                values = null;
            if (context.has_key('forloop'))
                parentloop = context.get('forloop');
            else parentloop = {};
            context.push();
            try {
                values = this.sequence.resolve(context, true);
            } catch (e if e instanceof VariableDoesNotExist) {
                values = [];
            }
            if (!values) values = [];
            if (type(values) != Array)
                values = array(values);
            var len_values = values.length;
            var unpack = this.loopvars.length > 1;
            context.set('forloop',{'parentloop': parentloop});
            var loop_dict = context.get('forloop');
            for (var [index, item] in Iterator(values)) {
                // Shortcuts for current loop iteration number.
                loop_dict['counter0'] = index;
                loop_dict['counter'] = index + 1;
                // Reverse counter iteration numbers.
                loop_dict['revcounter'] = len_values - index;
                loop_dict['revcounter0'] = len_values - index - 1;
                // Boolean values designating first and last times through loop.
                loop_dict['first'] = (index == 0);
                loop_dict['last'] = (index == len_values - 1);

                if (unpack) {
                    var obj = {};
                    for each (var a in zip(this.loopvars, item))
                        obj[a[0]] = a[1]; 
                    context.update(obj);
                } else
                    context.set(this.loopvars[0], item);
                for each (var node in this.nodelist_loop)
                    nodelist.push(node.render(context));
                if (unpack)
                    context.pop();
            }
            context.pop();
            return nodelist.render(context);
        }
    });

    var IfEqualNode = type('IfEqualNode', Node, {
        '__init__': function __init__(var1, var2, nodelist_true, nodelist_false, negate){
            this.var1 = new Variable(var1);
            this.var2 = new Variable(var2);
            this.nodelist_true = nodelist_true;
            this.nodelist_false = nodelist_false;
            this.negate = negate;
        },

        'render': function render(context){
            var val1 = null,
                val2 = null;
            try {
                val1 = this.var1.resolve(context);
            }
            catch (e if e instanceof VariableDoesNotExist) {
                val1 = null;
            }
            try {
                val2 = this.var2.resolve(context);
            }
            catch (e if e instanceof VariableDoesNotExist) {
                val2 = null;
            }
            if ((this.negate && val1 != val2) || (!this.negate && val1 == val2))
                return this.nodelist_true.render(context);
            return this.nodelist_false.render(context);
        }
    });

    var IfNode = type('IfNode', Node, {
        '__init__': function __init__(bool_exprs, nodelist_true, nodelist_false, link_type){
            this.bool_exprs = bool_exprs;
            this.nodelist_true = nodelist_true;
            this.nodelist_false = nodelist_false;
            this.link_type = link_type;
        },

        'get_nodes_by_type': function get_nodes_by_type(nodetype){
            var nodes = [];
            if (isinstance(this, nodetype))
                nodes.push(this);
            nodes = nodes.concat(this.nodelist_true.get_nodes_by_type(nodetype));
            nodes = nodes.concat(this.nodelist_false.get_nodes_by_type(nodetype));
            return nodes;
        },

        'render': function render(context){
            var value = null,
                ifnot = null,
                bool_expr = null;

            if (this.link_type == IfNode.LinkTypes.or_) {
                for (var i = 0; i < this.bool_exprs.length; i++) {
                    ifnot = this.bool_exprs[i][0];
                    bool_expr = this.bool_exprs[i][1];
                    try {
                        value = bool_expr.resolve(context, true);
                    }
                    catch (e if e instanceof VariableDoesNotExist) {
                        value = null;
                    }
                    if ((value && !ifnot) || (ifnot && !value))
                        return this.nodelist_true.render(context);
                }
                return this.nodelist_false.render(context);
            } else {
                for (var i = 0; i < this.bool_exprs.length; i++) {
                    ifnot = this.bool_exprs[i][0];
                    bool_expr = this.bool_exprs[i][1];
                    try {
                        value = bool_expr.resolve(context, true);
                    }
                    catch (e if e instanceof VariableDoesNotExist) {
                        value = null;
                    }
                    if (!((value && !ifnot) || (ifnot && !value)))
                        return this.nodelist_false.render(context);
                }
                return this.nodelist_true.render(context);
            }
        }
    });

    IfNode.LinkTypes = {'and_':0, 'or_': 1};

/* --------------------- Registrando los nodos -------------------------*/
function do_for(parser, token, negate){
    var bits = array(token.split_contents());
    if (bits.length < 4)
        throw new TemplateSyntaxError("'for' statements should have at least four words: %s".subs(token.contents));
    var is_reversed = bits[bits.length - 1] == 'reversed';
    var in_index = is_reversed && bits.length -3 || bits.length - 2;
    if ((bits[in_index]) != 'in')
        throw new TemplateSyntaxError("'for' statements should use the format 'for x in y': %s".subs(token.contents));

    /* TODO: Validar que esten separados por comas */
    var loopvars = bits.slice(1, in_index).join('').split(',');
    
    for each (var value in loopvars)
        if (value.blank() || include(value, ' '))
            throw new TemplateSyntaxError("'for' tag received an invalid argument: %s".subs(token.contents));
    var sequence = parser.compile_filter(bits[in_index + 1]);
    var nodelist_loop = parser.parse(['endfor']);
    parser.delete_first_token();
    return new ForNode(loopvars, sequence, is_reversed, nodelist_loop);
}
register.tag("for", do_for)

function do_ifequal(parser, token, negate){
    var bits = array(token.split_contents());
    if (bits.length != 3)
        throw new TemplateSyntaxError, "%s takes two arguments".subs(bits[0]);
    var end_tag = 'end' + bits[0];
    var nodelist_true = parser.parse(['else', end_tag]);
    var nodelist_false = null;
    token = parser.next_token();
    if (token.contents == 'else') {
        nodelist_false = parser.parse([end_tag]);
        parser.delete_first_token();
    } else {
        nodelist_false = new NodeList();
    }
    return new IfEqualNode(bits[1], bits[2], nodelist_true, nodelist_false, negate);
}

function ifequal(parser, token) { 
    return do_ifequal(parser, token, false); 
}
register.tag("ifequal", ifequal);

function ifnotequal(parser, token) { 
    return do_ifequal(parser, token, true); 
}
register.tag("ifnotequal", ifnotequal);

    function do_if(parser, token) {

        var link_type = null;

        var bits = token.contents.split(/\s+/);
        bits.shift();
        if (!bool(bits))
            throw new TemplateSyntaxError("'if' statement requires at least one argument")

        var bitstr = bits.join(' ');
        var boolpairs = bitstr.split(' and ');
        var boolvars = [];
        if (boolpairs.length == 1){
            link_type = IfNode.LinkTypes.or_;
            boolpairs = bitstr.split(' or ');
        }
        else{
            link_type = IfNode.LinkTypes.and_;
            if (include(bitstr, ' or '))
                throw new TemplateSyntaxError, "'if' tags can't mix 'and' and 'or'";
        }
        for each (var boolpair in boolpairs) {
            if (include(boolpair, ' ')){
                var not = null, boolvar = null;
                try {
                    [not, boolvar] = boolpair.split(' ');
                } catch (e if e instanceof VariableDoesNotExist) {
                    throw new TemplateSyntaxError, "'if' statement improperly formatted";
                }
                if (not != 'not')
                    throw new TemplateSyntaxError, "Expected 'not' in if statement";
                boolvars.push([true, parser.compile_filter(boolvar)]);
            } else {
                boolvars.push([false, parser.compile_filter(boolpair)]);
            }
        }
        var nodelist_true = parser.parse(['else', 'endif']);
        token = parser.next_token();
        if (token.contents == 'else') {
            var nodelist_false = parser.parse(['endif']);
            parser.delete_first_token();
        } else {
            nodelist_false = new NodeList();
        }
        return new IfNode(boolvars, nodelist_true, nodelist_false, link_type);
    }

register.tag("if", do_if);

$P({ 'register': register });