from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.shortcuts import redirect

def login(request):
    username = request.POST['username']
    password = request.POST['password']
    user = authenticate(username=username, password=password)
    if user is not None:
        if user.is_active:
            django_login(request, user)
    return redirect('/')
        
        
def logout(request):
    django_logout(request)
    return redirect('/')
