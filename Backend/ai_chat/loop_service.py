class AILoopService:
    @staticmethod
    def extract_tasks(user_message: str, audio_bytes: bytes | None = None, audio_mime_type: str | None = None) -> list[str]:
        raise NotImplementedError

    @staticmethod
    def create_loop(conversation, user, tasks: list[str]):
        raise NotImplementedError

    @staticmethod
    def reason_task(loop, user):
        raise NotImplementedError

    @staticmethod
    def approve_task(loop, choice) -> bool:
        raise NotImplementedError

    @staticmethod
    def decline_task(loop, reason_message):
        raise NotImplementedError

    @staticmethod
    def get_active_loop(conversation):
        raise NotImplementedError
