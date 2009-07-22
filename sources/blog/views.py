# -*- coding: utf-8 -*-
# coding: utf-8

from django.http import HttpResponseRedirect
from django.conf import settings
from django.shortcuts import render_to_response

def load_offline(request):
    return HttpResponseRedirect('/blog/')