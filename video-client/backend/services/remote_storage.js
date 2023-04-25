const fs = require('fs')
const connections = require('../common/connections')


let storeToS3 = async (local_dir, external_dir) =>
{
    const del = await import('del')
    try {
        let upload = await connections.get().s3.Upload(
            {
                path: local_dir, // относительный путь до папки
                save_name: true, // сохранять оригинальные названия файлов
            },
            external_dir
        );
        console.log(upload)
        await del.deleteAsync([local_dir], {force: true})
    }
    catch (e) {
        console.log("Error uploading to s3:", e)
    }
}

module.exports = {
    store: storeToS3
}