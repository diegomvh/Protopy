require('event');
require('blog.post.models', 'Tag', 'Post');
require('doff.forms.base', 'ModelForm');
require('doff.template.loader');
require('doff.template.context', 'RequestContext');
require('doff.utils.http', 'HttpResponse', 'HttpResponseRedirect');

var PostForm = type('PostForm', ModelForm, {
    'Meta': {
        'model': Post
    }
});

var TagForm = type('TagForm', ModelForm, {
    'Meta': {
        'model': Tag
    }
});

function add_tag(request){
    if (request.method == 'POST') {
	var formtag = new TagForm({ data: request.POST });
	if (formtag.is_valid()) {
	    formtag.save();
	    return new HttpResponseRedirect('/');
	}
    } else {
        var formtag = new TagForm();
    }
    var t = loader.get_template('add_tag.html');
    var response = new HttpResponse();
    response.write(t.render(new RequestContext(request, {'formtag': formtag })));
    return response;
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    tag.delete();
    return new HttpResponseRedirect('/');
}

function remove_post(request, slug){
    var post = Post.objects.get({'slug': slug});
    post.delete();
    return new HttpResponseRedirect('/');
}

function add_post(request) {
    if (request.method == 'POST') {
	var formpost = new PostForm({ data: request.POST });
	if (formpost.is_valid()) {
            formpost.save();
        return new HttpResponseRedirect('/');
	}
    } else {
	var formpost = new PostForm();
    }
    var t = loader.get_template('add_post.html');
    var response = new HttpResponse();
    response.write(t.render(new RequestContext(request, {'formpost': formpost })));
    return response;
}

publish({ 
    add_tag: add_tag,
    add_post: add_post,
    remove_tag: remove_tag,
    remove_post: remove_post
});