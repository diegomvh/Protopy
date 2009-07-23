from blog.post.models import Post, Tag
from django.forms.models import ModelForm
from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template.context import RequestContext

class TagForm(ModelForm):
    class Meta:
        model = Tag
              
class PostForm(ModelForm):
    class Meta:
        model = Post
        
def add_tag(request):
    if request.method == 'POST':
        formtag = TagForm(request.POST)
        if formtag.is_valid():
            formtag.save()
            return HttpResponseRedirect('/')
    else:
        formtag = TagForm()
    return render_to_response('add_tag.html', {'formtag': formtag}, context_instance=RequestContext(request))

def remove_tag(request):
    pass

def add_post(request):
    if request.method == 'POST':
        formpost = PostForm(request.POST)
        if formpost.is_valid():
            formpost.save()
            return HttpResponseRedirect('/')
    else:
        formpost = PostForm()
    return render_to_response('add_post.html', {'formpost': formpost}, context_instance=RequestContext(request))

def remove_post(request):
    pass