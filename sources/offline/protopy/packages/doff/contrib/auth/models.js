require('doff.db.models.manager', 'EmptyManager');

var AnonymousUser = type('AnonymousUser', [ object ], {
    id: null,
    username: '',
    _groups: new EmptyManager(),
    _user_permissions: new EmptyManager(),

    __init__: function() {}
        pass

    def __str__(self):
        return 'AnonymousUser'

    def __eq__(self, other):
        return isinstance(other, self.__class__)

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return 1 # instances always return the same hash value

    def save(self):
        raise NotImplementedError

    def delete(self):
        raise NotImplementedError

    def set_password(self, raw_password):
        raise NotImplementedError

    def check_password(self, raw_password):
        raise NotImplementedError

    def _get_groups(self):
        return self._groups
    groups = property(_get_groups)

    def _get_user_permissions(self):
        return self._user_permissions
    user_permissions = property(_get_user_permissions)

    def has_perm(self, perm):
        return False

    def has_perms(self, perm_list):
        return False

    def has_module_perms(self, module):
        return False

    def get_and_delete_messages(self):
        return []

    def is_anonymous(self):
        return true

    def is_authenticated(self):
        return false
