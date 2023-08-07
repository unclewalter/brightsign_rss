// ======= Globals =======

const fs = require('fs');
const path = require('path');
const mime = require('mime');

const RSS = require('rss');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server_host = process.env.HOSTNAME || getIPAddress();

const root_media_directory = '/usr/share/media/';

const accepted_mime_types = [
    "image/png",
    "image/jpg",
    "image/bmp",
    "video/mp4",
    "video/x-msvideo",
    "video/h264",
    "video/mp2t",
    "video/mpeg",
    "video/webm",
    "video/x-matroska",
    "video/quicktime",
    "video/x-motion-jpeg"
]



// ======= Utilities =======

function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return '0.0.0.0';
}


function getChecksum(path) {
    return new Promise(function (resolve, reject) {
        const hash = crypto.createHash('md5');
        const input = fs.createReadStream(path);

        input.on('error', reject);

        input.on('data', function (chunk) {
            hash.update(chunk);
        });

        input.on('close', function () {
            resolve({
                path: path,
                hash: hash.digest('hex')
            });
        });
    });
}

// ======= Feed generator =======

function createRSSFeed(creator_id, screen_id) {

    const media_directory = `${root_media_directory}${creator_id}/${screen_id}/`;

    console.log('media_directory: ', media_directory);

    fs.readdir(media_directory, (err, files) => {
        let promise_map = files.map((file) => {
            let fileDetails = fs.lstatSync(path.resolve(media_directory, file));
            // check if the file is directory 
            if (fileDetails.isDirectory()) {
                // console.log('Directory: ' + file);
            } else {
                item_url = media_directory + file
                // console.log('File: ' + item_url);
                return getChecksum(item_url);
            }
        });

        Promise.all(promise_map).then((value) => {
            const feed_base_url = `http://${server_host}:${PORT}/`;

            let feed = new RSS({
                title: 'NTH Screen 3 MRSS',
                description: 'MRSS feed for Brightsign player',
                feed_url: `${feed_base_url}${creator_id}_${screen_id}_feed.xml`,
                site_url: feed_base_url,
                ttl: '1',
                custom_namespaces: {
                    'media': 'http://search.yahoo.com/mrss/'
                }
            });

            value.forEach((item) => {
                const stats = fs.statSync(item.path);
                const mime_type = mime.getType(item.path);
                if (item && accepted_mime_types.includes(mime_type)) {
                    // console.log('item: ', item);
                    item_url = encodeURI(feed_base_url + item.path.replace('/usr/share/', ''));
                    feed.item({
                        title: path.basename(item.path),
                        guid: item.hash,
                        description: '',
                        url: item_url,
                        categories: ['video'],
                        custom_elements: [
                            {
                                'media:content': {
                                    _attr: {
                                        url: item_url,
                                        fileSize: stats.size,
                                        type: mime_type,
                                        medium: mime_type.split("/")[0]
                                    }
                                }
                            }
                        ]
                    });
                }
            });

            fs.writeFile(`public/${creator_id}_${screen_id}_feed.xml`, feed.xml(), function (err) {
                if (err) {
                    return console.err(err);
                }
                console.log("The file was saved!");
            });
        })
    });


}

// ======= Watch /media folder =======

function refreshRSSFeeds() {
    fs.readdir(root_media_directory, (err, root_dir_files) => {
        if (err) {
            console.error(err);
        } else {
            root_dir_files.forEach((root_dir_file) => {
                let root_dir_file_details = fs.lstatSync(path.resolve(root_media_directory, root_dir_file));
                if (root_dir_file_details.isDirectory()) {
                    let creator_directory = `${root_media_directory}${root_dir_file}`;
                    fs.readdir(creator_directory, (err, creator_dir_files) => {
                        creator_dir_files.forEach((creator_dir_file) => {
                            let creator_dir_file_details = fs.lstatSync(path.resolve(creator_directory, creator_dir_file));
                            if (creator_dir_file_details.isDirectory()) {
                                createRSSFeed(root_dir_file.toString(), creator_dir_file.toString());
                            }
                        });
                    });
                }
            });
        }
    });
}

refreshRSSFeeds();


fs.watch(root_media_directory, { recursive: true }, (eventType, filename) => {
    console.log('Watch event:', eventType, 'File:', filename);
    refreshRSSFeeds();
});

// ======= Static web server =======

const express = require('express');
const { ifError } = require('assert');
const app = express();
app.set('trust proxy', true)

const logger = function (request, response, next) {
    const date = new Date();
    console.log(date.toISOString(), "- Served:", request.path);
    next();
}

app.use(logger); // for all routes.

app.use(express.static('public'));
app.use('/media', express.static('../../share/media'));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));