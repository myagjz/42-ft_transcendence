from django.urls import path
from .views import UserViewset, GameViewSet

urlpatterns = [
    path('users/<str:username>', UserViewset.as_view({'get': 'get_user_info'})),
    path('get_username', UserViewset.as_view({'get': 'get_username'})),
    path('generate_tfa', UserViewset.as_view({'get': 'generate_tfa'})),
    path('verify_tfa', UserViewset.as_view({'post': 'verify_tfa'})),
    path('update_ui', UserViewset.as_view({'post': 'update_ui'})),
    path('send_friend_request', UserViewset.as_view({'post': 'send_friend_request'})),
    path('is_friend', UserViewset.as_view({'post': 'is_friend'})),
    path('accept_friend_request', UserViewset.as_view({'post': 'accept_friend_request'})),
    path('reject_friend_request', UserViewset.as_view({'post': 'reject_friend_request'})),
    path('remove_friend', UserViewset.as_view({'post': 'remove_friend'})),
    path('block_user', UserViewset.as_view({'post': 'block_user'})),
    path('unblock_user', UserViewset.as_view({'post': 'unblock_user'})),
    path('get_blocked_users', UserViewset.as_view({'get': 'get_blocked_users'})),
    path('get_friends', UserViewset.as_view({'get': 'get_friends'})),
    path('get_users_by_score', UserViewset.as_view({'get' : 'get_users_by_score'})),
    path('create_game', GameViewSet.as_view({'post': 'create_game'})),
    path('get_user_games/<str:username>', GameViewSet.as_view({'get': 'get_user_games'})),
    path('get_stats/<str:username>', GameViewSet.as_view({'get': 'get_stats'}))
]