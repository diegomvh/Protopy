# coding: utf-8

from django.http import HttpResponseRedirect
from django.conf import settings
from django.shortcuts import render_to_response

def index(request):
    return HttpResponseRedirect('/blog/')

def run_offline(request):
    return render_to_response('blog/offline.html', {
        'OFFLINE_BASE': settings.OFFLINE_BASE,
        'PROJECT_MODULE': 'blog',
        'PROJECT_DESCRIPTION': 'Un blog offline',
    })