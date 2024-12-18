from django.urls import path
from .views import AuthViewset, NotificationViewSet

urlpatterns = [
    path('intra', AuthViewset.as_view({'get': 'intra_login'})),
    path('tfa_login', AuthViewset.as_view({'post': 'tfa_login'})),
    path('logout', AuthViewset.as_view({'get': 'user_logout'})),
    path('user_register', AuthViewset.as_view({'post': 'user_register'})),
    path('user_login', AuthViewset.as_view({'post': 'user_login'})),
    path('check_notifications', NotificationViewSet.as_view({'get': 'check_notifications'})),
    path('get_intra_auth_url', AuthViewset.as_view({'get': 'get_intra_auth_url'})),
    path('get_new_token', AuthViewset.as_view({'post': 'get_new_token'}))
]