unzip records-viewer.zip
psql -U postgres -W -d records-viewer-medsenger-bot -h 127.0.0.1 < records-viewer_bot.sql
