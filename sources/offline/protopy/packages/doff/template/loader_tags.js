require('doff.template.base', 'TemplateSyntaxError', 'TemplateDoesNotExist', 'Variable', 'Library', 'Node', 'TextNode');
require('doff.template.loader');

var register = new Library();

/* defo:translate
 * Nodos para definicion de bloques, carga e inclusion de templates.
 */

var BlockNode = type('BlockNode', [ Node ], {
    __init__: function(name, nodelist, parent){
        this.name = name;
        this.nodelist = nodelist;
        this.parent = parent || null;
    },

    render: function(context){
        context.push();
        this.context = context;
        context.set('block', this);
        var result = this.nodelist.render(context);
        context.pop();
        return result;
    },

    super: function(){
        if (this.parent)
            return this.parent.render(this.context);
        return '';
    },

    add_parent: function(nodelist) {
        if (this.parent)
            this.parent.add_parent(nodelist);
        else
            this.parent = new BlockNode(this.name, nodelist);
    }
});

var ExtendsNode = type('ExtendsNode', [ Node ], {
    must_be_first: true,
    __init__: function(nodelist, parent_name, parent_name_expr){
        this.nodelist = nodelist;
        this.parent_name = parent_name;
        this.parent_name_expr = parent_name_expr;
    },

    render: function(context){
        context.push();
        this.context = context;
        context.set('block', this);
        var result = this.nodelist.render(context);
        context.pop();
        return result;
    },

    get_parent: function(context) {
        var source = null,
            parent = null;
        if (this.parent_name_expr)
            this.parent_name = this.parent_name_expr.resolve(context);
        parent = this.parent_name;
        if (!parent) {
            var error_msg = "Invalid template name in 'extends' tag: %s.".subs(parent);
            if (this.parent_name_expr)
                error_msg += " Got this from the '%s' variable.".subs(this.parent_name_expr.token);
            throw new TemplateSyntaxError(error_msg);
        }
        if (parent['render'])
            return parent;
        try {
            source = loader.get_template(parent);
	    return source;
        }
        catch (e if isinstance(e, TemplateDoesNotExist)) {
            throw new TemplateSyntaxError("Template %r cannot be extended, because it doesn't exist".subs(parent));
        }
    },

    render: function(context){
        var compiled_parent = this.get_parent(context);
        var parent_blocks = {};
        for each (var n in compiled_parent.nodelist.get_nodes_by_type(BlockNode)) {
            parent_blocks[n.name] = n;
        }
        for each (var block_node in this.nodelist.get_nodes_by_type(BlockNode)) {
            var parent_block = parent_blocks[block_node.name];
            if (!parent_block){
                for each (var node in compiled_parent.nodelist) {
                    if (!isinstance(node, TextNode)) {
                        if (isinstance(node, ExtendsNode))
                            node.nodelist.push(block_node);
                        break;
                    }
                }
            } else {
                parent_block.parent = block_node.parent;
                parent_block.add_parent(parent_block.nodelist);
                parent_block.nodelist = block_node.nodelist;
            }
        }
        return compiled_parent.render(context);
    }

});

var ConstantIncludeNode = type('ConstantIncludeNode', [ Node ], {
    __init__: function(template_path){
        try {
            var t = loader.get_template(template_path);
            this.template = t;
        } catch(e) {
            this.template = null;
        }
    },

    render: function(context){
        if (this.template)
            return this.template.render(context);
        else
            return '';
    }
});

var IncludeNode = type('IncludeNode', [ Node ], {
    __init__: function(template_name) {
        this.template_name = new Variable(template_name);
    },

    render: function(context) {
        try {
            var template_name = this.template_name.resolve(context);
            t = loader.get_template(template_name);
            return t.render(context);
        }
        catch (e) {
            return '';
        }
    }
});

/* defo:translate
 * Funciones que procesan los tokens, generando y retornanodo los nodos correspondientes
 */
function do_block(parser, token) {
    var bits = token.split_contents();
    if (bits.length != 2)
        throw new TemplateSyntaxError("'%s' tag takes only one argument".subs(bits[0]));
    var block_name = bits[1];
    if (isundefined(parser.__loaded_blocks)) {
        parser.__loaded_blocks = [block_name];
    }
    else {
        if (include(parser.__loaded_blocks, block_name))
            throw new TemplateSyntaxError("'%s' tag with name '%s' appears more than once".subs(bits[0], block_name));
        parser.__loaded_blocks.push(block_name);
    }
    var nodelist = parser.parse(['endblock', 'endblock %s'.subs(block_name)]);
    parser.delete_first_token();
    return new BlockNode(block_name, nodelist);
};

function do_extends(parser, token) {
    var bits = token.split_contents();
    if (bits.length != 2)
        throw new TemplateSyntaxError("'%s' takes one argument".subs(bits[0]));
    var parent_name = null;
    var parent_name_expr = null;
    if (include(['"', "'"], bits[1][0]) && bits[1][bits[1].length - 1] == bits[1][0])
        parent_name = bits[1].substring(1, bits[1].length -1);
    else
        parent_name_expr = parser.compile_filter(bits[1]);
    var nodelist = parser.parse();
    if (bool(nodelist.get_nodes_by_type(ExtendsNode)))
        throw new TemplateSyntaxError("'%s' cannot appear more than once in the same template".subs(bits[0]));
    return new ExtendsNode(nodelist, parent_name, parent_name_expr);
};

function do_include(parser, token) {
    var bits = token.split_contents();
    if (bits.length != 2)
        throw new TemplateSyntaxError("%s tag takes one argument: the name of the template to be included".subs(bits[0]));
    var path = bits[1];
    if (include(['"', "'"], path[0]) && path[path.length -1] == path[0])
        return new ConstantIncludeNode(path.substring(1, bits.length -1));
    return new IncludeNode(bits[1]);
};

/* defo:translate
 * Regsitro los nodos, para su uso en los templates
 */ 
register.tag('block', do_block);
register.tag('extends', do_extends);
register.tag('include', do_include);

publish({ 
    register: register
});