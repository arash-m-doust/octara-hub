from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='status',
            field=models.CharField(
                choices=[
                    ('online', 'Online'),
                    ('idle', 'Idle'),
                    ('dnd', 'Do Not Disturb'),
                    ('offline', 'Offline'),
                ],
                default='online',
                max_length=10,
            ),
        ),
    ]
