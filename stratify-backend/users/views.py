import time

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer
from .telegram import send_telegram_message_optional

User = get_user_model()


def _tokens_payload(user):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_s = str(refresh)
    ser = UserSerializer(user).data
    return {
        'access': access,
        'refresh': refresh_s,
        'user': ser,
        'data': {'user': ser, 'access': access, 'refresh': refresh_s},
    }


class RegisterView(APIView):
    # Skip JWT: browsers often send a stale Authorization header; invalid tokens would 401 before this view runs.
    authentication_classes = []

    def post(self, request):
        username = request.data.get('username')
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')
        risk_tolerance = request.data.get('risk_tolerance', 'moderate')

        if not all([username, email, password]):
            return Response(
                {'error': 'Missing fields', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            risk_tolerance=risk_tolerance,
        )

        payload = _tokens_payload(user)
        send_telegram_message_optional(f'New signup: {email}')
        return Response(
            {
                **payload,
                'message': 'User registered successfully',
                'status_code': 201,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')

        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials', 'status_code': 401},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = _tokens_payload(user)
        send_telegram_message_optional(f'Login: {email}')
        return Response(
            {
                **payload,
                'message': 'Login successful',
                'status_code': 200,
            },
            status=status.HTTP_200_OK,
        )


class SetMPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        mpin = request.data.get('mpin')
        user = request.user

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password', 'status_code': 401},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not mpin or len(str(mpin)) < 4 or len(str(mpin)) > 6:
            return Response(
                {'error': 'MPin must be 4-6 digits', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_mpin(str(mpin))
        return Response(
            {'data': {}, 'message': 'MPin set successfully', 'status_code': 200},
            status=status.HTTP_200_OK,
        )


class VerifyMPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mpin = request.data.get('mpin')
        user = request.user

        if not user.verify_mpin(str(mpin) if mpin is not None else ''):
            return Response(
                {'error': 'Invalid MPin', 'status_code': 403},
                status=status.HTTP_403_FORBIDDEN,
            )

        mpin_token = f'mpin_{user.id}_{int(time.time())}'
        return Response(
            {'data': {'mpin_token': mpin_token}, 'message': 'MPin verified', 'status_code': 200},
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {'data': UserSerializer(request.user).data, 'status_code': 200},
            status=status.HTTP_200_OK,
        )
