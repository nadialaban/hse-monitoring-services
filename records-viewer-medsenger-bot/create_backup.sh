pg_dump -U postgres -W -d records-viewer-medsenger-bot -h 127.0.0.1 > records-viewer_bot.sql
zip -r records-viewer.zip records-viewer_bot.sql
