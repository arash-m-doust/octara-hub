from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.authentication'
    verbose_name = 'Authentication'

    def ready(self):
        from django.contrib.auth.models import User
        from django.db.models.signals import post_save
        from .models import UserProfile

        def create_profile(sender, instance, created, **kwargs):
            if created and not hasattr(instance, '_profile_created'):
                UserProfile.objects.get_or_create(user=instance)

        post_save.connect(create_profile, sender=User)
