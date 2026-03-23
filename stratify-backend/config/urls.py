from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from chat.views import ChatHistoryView, ChatView
from portfolio.views import AddHoldingView, PortfolioView, RemoveHoldingView
from stocks.views import StockDetailView, StockForecastView, StockListView, StockSentimentView
from users.views import LoginView, ProfileView, RegisterView, SetMPinView, VerifyMPinView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/auth/set-mpin/', SetMPinView.as_view(), name='auth-set-mpin'),
    path('api/auth/verify-mpin/', VerifyMPinView.as_view(), name='auth-verify-mpin'),
    path('api/auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('api/stocks/', StockListView.as_view(), name='stock-list'),
    path('api/stocks/<str:symbol>/', StockDetailView.as_view(), name='stock-detail'),
    path('api/stocks/<str:symbol>/forecast/', StockForecastView.as_view(), name='stock-forecast'),
    path('api/stocks/<str:symbol>/sentiment/', StockSentimentView.as_view(), name='stock-sentiment'),
    path('api/portfolio/', PortfolioView.as_view(), name='portfolio'),
    path('api/portfolio/add/', AddHoldingView.as_view(), name='portfolio-add'),
    path('api/portfolio/<int:holding_id>/', RemoveHoldingView.as_view(), name='portfolio-remove'),
    path('api/chat/', ChatView.as_view(), name='chat'),
    path('api/chat/history/', ChatHistoryView.as_view(), name='chat-history'),
]
