import time
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .gemini_client import generate_reply
from .models import ChatMessage
from .serializers import ChatMessageSerializer


class ChatView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        query = (request.data.get('query') or '').strip()
        if not query:
            return Response(
                {'error': 'Query required', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = request.data.get('session_id') or str(uuid.uuid4())
        start = time.time()
        ai_response = generate_reply(query)
        response_time_ms = int((time.time() - start) * 1000)

        user = request.user if getattr(request.user, 'is_authenticated', False) else None
        ChatMessage.objects.create(
            user=user,
            session_id=session_id,
            query=query,
            response=ai_response,
            query_type='qa',
            response_time_ms=response_time_ms,
            is_public=user is None,
        )

        return Response(
            {
                'data': {
                    'response': ai_response,
                    'session_id': session_id,
                    'query_type': 'qa',
                    'response_time_ms': response_time_ms,
                },
                'status_code': 200,
            },
            status=status.HTTP_200_OK,
        )


class ChatHistoryView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response(
                {'error': 'Session ID required', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        messages = ChatMessage.objects.filter(session_id=session_id).order_by('created_at')
        return Response(
            {'data': ChatMessageSerializer(messages, many=True).data, 'status_code': 200},
            status=status.HTTP_200_OK,
        )
