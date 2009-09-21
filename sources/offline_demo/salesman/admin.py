from django.contrib.admin import AdminSite
from salesman.models import *

class AdminSalesman(AdminSite):
    pass

site = AdminSalesman()

site.register(Ciudad)

