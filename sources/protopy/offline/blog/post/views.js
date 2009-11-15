require('event');
require('blog.post.models', 'Tag', 'Post');
require('doff.forms.base', 'ModelForm');
require('doff.utils.shortcuts', 'render_to_response', 'redirect');
require('doff.template.context', 'RequestContext');
require('doff.utils.http', 'HttpResponseRedirect');

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
            return redirect('/');
        }
    } else {
        var formtag = new TagForm();
    }
    return render_to_response('add_tag.html', {'formtag': formtag }, new RequestContext(request));
}

function remove_tag(request, slug){
    var tag = Tag.objects.get({'slug': slug});
    tag.delete();
    return redirect('/');
}

function remove_post(request, slug){
    var post = Post.objects.get({'slug': slug});
    post.delete();
    return redirect('/');
}

function add_post(request) {
    if (request.method == 'POST') {
        var formpost = new PostForm({ data: request.POST });
        if (formpost.is_valid()) {
            formpost.save();
        return redirect('/');
        }
    } else {
        var formpost = new PostForm();
    }
    return render_to_response('add_post.html', {'formpost': formpost }, new RequestContext(request));
}

publish({ 
    add_tag: add_tag,
    add_post: add_post,
    remove_tag: remove_tag,
    remove_post: remove_post
});