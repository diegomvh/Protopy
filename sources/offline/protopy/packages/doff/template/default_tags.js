require('doff.template.base', 'Node', 'Variable', 'NodeList', 'Template', 'TemplateSyntaxError', 'VariableDoesNotExist', 'get_library', 'Library', 'InvalidTemplateLibrary');
require('doff.template.base', 'BLOCK_TAG_START', 'BLOCK_TAG_END', 'VARIABLE_TAG_START', 'VARIABLE_TAG_END', 'SINGLE_BRACE_START', 'SINGLE_BRACE_END', 'COMMENT_TAG_START', 'COMMENT_TAG_END');
require('doff.template.context', 'Context');
require('itertools');

var register = new Library();

/*
 * Implements the actions of the autoescape tag.
 */
var AutoEscapeControlNode = type('AutoEscapeControlNode', [ Node ], {
    __init__: function(setting, nodelist) {
        this.setting = setting;
        this.nodelist = nodelist;
    },
    
    render: function(context) {
        var old_setting = context.autoescape;
        context.autoescape = this.setting;
        var output = this.nodelist.render(context);
        context.autoescape = old_setting;
        return output;
    }
});

var CommentNode = type('CommentNode', [ Node ], {
    render: function(context) { 
        return "";
    }
});

var CycleNode = type('CycleNode', [ Node ], {
    __init__: function(cyclevars, variable_name) {
        this.cycle_iter = itertools.cycle([new Variable(v) for each (v in cyclevars)]);
        this.variable_name = variable_name || null;
    },

    render: function(context) { 
        var value = this.cycle_iter.next().resolve(context);
        if (this.variable_name)
            context.set(this.variable_name, value);
        return value;
    }
});

var FilterNode = type('FilterNode', [ Node ], {
    __init__: function(filter_expr, nodelist) {
        this.filter_expr = filter_expr;
        this.nodelist = nodelist;
    },

    render: function(context) { 
        var output = this.nodelist.render(context);
        // Apply filters.
        context.update({'variable': output});
        var filtered = this.filter_expr.resolve(context);
        context.pop();
        return filtered;
    }
});

var FirstOfNode = type('FirstOfNode', [ Node ], {
    __init__: function(vars) {
        this.vars = [new Variable(v) for each (v in vars)];
    },

    render: function(context) { 
        for each (v in this.vars) {
            try {
                var value = v.resolve(context);
            } catch (e if isinstance(e, VariableDoesNotExist)) {
                continue;
            }
            if (value)
                return value;
        }
        return '';
    }
});

var ForNode = type('ForNode', [ Node ], {
    __init__: function(loopvars, sequence, is_reversed, nodelist_loop){
        this.loopvars = loopvars;
        this.sequence = sequence;
        this.is_reversed = is_reversed;
        this.nodelist_loop = nodelist_loop;
    },

    get_nodes_by_type: function(nodetype) {
        var nodes = [];
        if (isinstance(this, nodetype))
            nodes.push(this);
        nodes = nodes.concat(this.nodelist_loop.get_nodes_by_type(nodetype));
        return nodes;
    },

    render: function(context) {
        var nodelist = new NodeList(),
            parentloop = null,
            values = null;
        if (context.has_key('forloop'))
            parentloop = context.get('forloop');
        else parentloop = {};
        context.push();
        try {
            values = this.sequence.resolve(context, true);
        } catch (e if isinstance(e, VariableDoesNotExist)) {
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

var IfEqualNode = type('IfEqualNode', [ Node ], {
    __init__: function(var1, var2, nodelist_true, nodelist_false, negate){
        this.var1 = new Variable(var1);
        this.var2 = new Variable(var2);
        this.nodelist_true = nodelist_true;
        this.nodelist_false = nodelist_false;
        this.negate = negate;
    },

    render: function(context){
        var val1 = null,
            val2 = null;
        try {
            val1 = this.var1.resolve(context);
        }
        catch (e if isinstance(e, VariableDoesNotExist)) {
            val1 = null;
        }
        try {
            val2 = this.var2.resolve(context);
        }
        catch (e if isinstance(e, VariableDoesNotExist)) {
            val2 = null;
        }
        if ((this.negate && val1 != val2) || (!this.negate && val1 == val2))
            return this.nodelist_true.render(context);
        return this.nodelist_false.render(context);
    }
});

var IfNode = type('IfNode', [ Node ], {
    LinkTypes: {'and_':0, 'or_': 1}
}, {
    __init__: function(bool_exprs, nodelist_true, nodelist_false, link_type){
        this.bool_exprs = bool_exprs;
        this.nodelist_true = nodelist_true;
        this.nodelist_false = nodelist_false;
        this.link_type = link_type;
    },

    get_nodes_by_type: function(nodetype){
        var nodes = [];
        if (isinstance(this, nodetype))
            nodes.push(this);
        nodes = nodes.concat(this.nodelist_true.get_nodes_by_type(nodetype));
        nodes = nodes.concat(this.nodelist_false.get_nodes_by_type(nodetype));
        return nodes;
    },

    render: function(context){
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
                catch (e if isinstance(e, VariableDoesNotExist)) {
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
                catch (e if isinstance(e, VariableDoesNotExist)) {
                    value = null;
                }
                if (!((value && !ifnot) || (ifnot && !value)))
                    return this.nodelist_false.render(context);
            }
            return this.nodelist_true.render(context);
        }
    }
});

var LoadNode = type('LoadNode', [ Node ], {
    render: function(context) { 
        return '';
    }
});

var NowNode = type('NowNode', [ Node ], {
    __init__: function(format_string) {
        this.format_string = format_string;
    },

    render: function(context) {
        var date = new Date();
        return string(date);
    }
});

var SpacelessNode = type('SpacelessNode', [ Node ], {
    __init__: function(nodelist) {
        this.nodelist = nodelist;
    },
    render: function(nodelist){
        var strip_spaces_between_tags = require('doff.utils.html', 'strip_spaces_between_tags');
        return strip_spaces_between_tags(this.nodelist.render(context).strip());
    }
});

var TemplateTagNode = type('TemplateTagNode', [ Node ], {
    mapping: {'openblock': BLOCK_TAG_START,
              'closeblock': BLOCK_TAG_END,
              'openvariable': VARIABLE_TAG_START,
              'closevariable': VARIABLE_TAG_END,
              'openbrace': SINGLE_BRACE_START,
              'closebrace': SINGLE_BRACE_END,
              'opencomment': COMMENT_TAG_START,
              'closecomment': COMMENT_TAG_END,
              }
    }, {
    __init__: function(tagtype) {
        this.tagtype = tagtype;
    },

    render: function(nodelist){
        return TemplateTagNode.mapping[this.tagtype] || '';
    }
});

var WithNode = type('WithNode', [ Node ], {
    __init__: function(variable, name, nodelist) {
        this.variable = variable;
        this.name = name;
        this.nodelist = nodelist;
    },

    render: function(context) { 
        var val = this.variable.resolve(context);
        context.push();
        context.set(this.name) = val;
        var output = this.nodelist.render(context);
        context.pop();
        return output;
    }
});

/* --------------------- Registrando los nodos -------------------------*/
function autoescape(parser, token) {
    /*
        Force autoescape behaviour for this block.
    */
    var args = token.split_contents().slice(1);
    if (args.length != 2)
        throw new TemplateSyntaxError("'Autoescape' tag requires exactly one argument.");
    var arg = args[1];
    if (!include(['on', 'off'], arg))
        throw new TemplateSyntaxError("'Autoescape' argument should be 'on' or 'off'");
    var nodelist = parser.parse(['endautoescape']);
    parser.delete_first_token();
    return new AutoEscapeControlNode((arg == 'on'), nodelist);
}
register.tag("autoescape", autoescape);

function comment(parser, token) {
    /*
        Ignores everything between ``{% comment %}`` and ``{% endcomment %}``.
    */
    parser.skip_past('endcomment');
    return new CommentNode();
}
register.tag("comment", comment);

function cycle(parser, token) {
    /*  Example
        {% for o in some_list %}
            <tr class="{% cycle 'row1' 'row2' %}">
                ...
            </tr>
        {% endfor %}

        <tr class="{% cycle 'row1' 'row2' 'row3' as rowcolors %}">...</tr>
        <tr class="{% cycle rowcolors %}">...</tr>
        <tr class="{% cycle rowcolors %}">...</tr>
    */
    var args = token.split_contents();

    if (args.length < 2)
        throw new TemplateSyntaxError("'cycle' tag requires at least two arguments");

    if (args.length == 2) {
        // {% cycle foo %} case.
        var name = args[1];
        if (!hasattr(parser, '_namedCycleNodes'))
            throw new TemplateSyntaxError("No named cycles in template. '%s' is not defined".subs(name));
        if (!(name in parser._namedCycleNodes))
            throw new TemplateSyntaxError("Named cycle '%s' does not exist".subs(name));
        return parser._namedCycleNodes[name];
    }
    if (args.length > 4 && args.slice(-2)[0] == 'as') {
        var name = args.slice(-1)[0];
        var node = new CycleNode(args.slice(1, -2), name);
        if (!hasattr(parser, '_namedCycleNodes'))
            parser._namedCycleNodes = {};
        parser._namedCycleNodes[name] = node;
    } else {
        var node = new CycleNode(args.slice(1));
    }
    return node;
}
register.tag("cycle", cycle);

function do_filter(parser, token) {
    /*  Example
        {% filter force_escape|lower %}
            This text will be HTML-escaped, and will appear in lowercase.
        {% endfilter %}
    */
    var bits = token.split_contents().slice(1);
    var filter_expr = parser.compile_filter("variable|%s".subs(rest));
    for each (var [func, unused] in filter_expr.filters) {
        if (getattr(func, '_decorated_function', func).name in {'escape':0, 'safe':0})
            throw new TemplateSyntaxError('"filter %s" is not permitted.  Use the "autoescape" tag instead.'.subs(func.name));
    }
    var nodelist = parser.parse(['endfilter']);
    parser.delete_first_token();
    return new FilterNode(filter_expr, nodelist);
}
register.tag("filter", do_filter);

function firstof(parser, token) {
    /*  Example 
        {% firstof var1 var2 var3 "fallback value" %}
    */
    var bits = token.split_contents().slice(1);
    if (bits.length < 1)
        throw new TemplateSyntaxError("'firstof' statement requires at least one argument");
    return new FirstOfNode(bits);
}
register.tag("firstof", firstof);

function do_for(parser, token, negate){
    /*  Example
        {% for key,value in dict.items %}
            {{ key }}: {{ value }}
        {% endfor %}
    */
    var bits = token.split_contents();
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
    var bits = token.split_contents();
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

    var bits = token.split_contents();
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
            } catch (e if isinstance(e, VariableDoesNotExist)) {
                throw new TemplateSyntaxError("'if' statement improperly formatted");
            }
            if (not != 'not')
                throw new TemplateSyntaxError("Expected 'not' in if statement");
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

var load_cache = {};
function load(parser, token) {
/*
    Loads a custom template tag set.

    For example, to load the template tags in
    ``django/templatetags/news/photos.py``::

        {% load news.photos %}
*/
	require('doff.conf.settings', 'settings');
    var bits = token.split_contents();
    for each (var taglib in bits.slice(1)) {
        if (include(load_cache, taglib)) { 
            parser.add_library(load_cache[taglib]);
            continue;
        }
        // add the library to the parser
        var lib = null;
        for each (var app in settings.INSTALLED_APPS) {
            try {
                lib = get_library(app + '.templatetags.%s'.subs(taglib));
                parser.add_library(lib);
            } catch (e if isinstance(e, InvalidTemplateLibrary)) {}
        }
        if (lib === null)
            throw new TemplateSyntaxError("'%s' is not a valid tag library".subs(taglib));
        else {
            load_cache[taglib] = lib;
        }
    }
    return new LoadNode();
}
register.tag("load", load);

function now(parser, token) {
/*
    Displays the date, formatted according to the given string.

    Uses the same format as PHP's ``date()`` function; see http://php.net/date
    for all the possible values.

    Sample usage::

        It is {% now "jS F Y H:i" %}
*/
    var bits = token.contents.split('"');
    if (len(bits) != 3)
        throw new TemplateSyntaxError("'now' statement takes one argument");
    var format_string = bits[1];
    return new NowNode(format_string);
}
register.tag("now", now);

function spaceless(parser, token) {
    /*
    Removes whitespace between HTML tags, including tab and newline characters.

    Example usage::

        {% spaceless %}
            <p>
                <a href="foo/">Foo</a>
            </p>
        {% endspaceless %}

    This example would return this HTML::

        <p><a href="foo/">Foo</a></p>

    Only space between *tags* is normalized -- not space between tags and text.
    In this example, the space around ``Hello`` won't be stripped::

        {% spaceless %}
            <strong>
                Hello
            </strong>
        {% endspaceless %}
    */
    var nodelist = parser.parse(['endspaceless']);
    parser.delete_first_token();
    return new SpacelessNode(nodelist);
}
register.tag("spaceless", spaceless);

function templatetag(parser, token) {
    /*
    Outputs one of the bits used to compose template tags.

    Since the template system has no concept of "escaping", to display one of
    the bits used in template tags, you must use the ``{% templatetag %}`` tag.

    The argument tells which template bit to output:

        ==================  =======
        Argument            Outputs
        ==================  =======
        ``openblock``       ``{%``
        ``closeblock``      ``%}``
        ``openvariable``    ``{{``
        ``closevariable``   ``}}``
        ``openbrace``       ``{``
        ``closebrace``      ``}``
        ``opencomment``     ``{#``
        ``closecomment``    ``#}``
        ==================  =======
*/
    var bits = token.split_contents();
    if (len(bits) != 2)
        throw new TemplateSyntaxError("'templatetag' statement takes one argument");
    var tag = bits[1];
    if (!include(TemplateTagNode.mapping, tag))
        throw new TemplateSyntaxError("Invalid templatetag argument: '%s' Must be one of: %s".subs(tag, keys(TemplateTagNode.mapping)));
    return new TemplateTagNode(tag);
}
register.tag("templatetag", templatetag);

function do_with(parser, token) {
    var bits = token.split_contents();
    if (bits.length != 4 || bits[2] != "as")
        throw new TemplateSyntaxError("%r expected format is 'value as name'".subs(bits[0]));
    var variable = parser.compile_filter(bits[1]);
    var name = bits[3];
    var nodelist = parser.parse(['endwith']);
    parser.delete_first_token();
    return new WithNode(variable, name, nodelist);
}
register.tag("with", do_with);

publish({ 
    register: register 
});