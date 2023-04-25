const pg = require('pg')
const kurento = require('kurento-client');
const EasyYandexS3 = require('easy-yandex-s3').default;

require('dotenv').config()

let getKurentoConnection = (uri) => {
    return new Promise((resolve, reject) => {
        kurento(uri, function (error, _kurentoClient) {
            if (error) {
                console.log("Could not find media server at address " + process.env.KURENTO_URI);
                reject(error)
            }

            console.log("Connected to kurento")
            resolve(_kurentoClient)
        });
    });
}

let is_connected = false;

const postgresClient = new pg.Client({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_LOGIN,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE
})

let s3client = null;

let kurentoClient = null;

let connect = async () => {
    try {
        s3client = process.env.S3_ENABLED ? new EasyYandexS3({
            auth: {
                accessKeyId: process.env.S3_KEY_ID,
                secretAccessKey: process.env.S3_KEY_SECRET,
            },
            Bucket: 'medsenger-videos', // например, "my-storage",
            debug: true, // Дебаг в консоли, потом можете удалить в релизе
        }) : null
    } catch (e) {
        console.error('s3 connection error', err.stack)
    }

    try {
        await postgresClient.connect()
    } catch (err) {
        console.error('postgres connection error', err.stack)
    }

    try {
        kurentoClient = await getKurentoConnection(process.env.KURENTO_URI)
    } catch (e) {
        console.error('kurento connection error', e.stack)
    }

    is_connected = true;
}

module.exports = {
    connect: connect,
    get: () => {
        return is_connected ?
            {
                postgres: postgresClient,
                kurento: kurentoClient,
                s3: s3client
            } : null
    }
};
