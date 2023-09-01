// ======= Globals =======

const fs = require('fs');
const { readdir } = require('fs').promises;

const path = require('path');
const mime = require('mime');

const RSS = require('rss');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server_host = process.env.HOSTNAME || getIPAddress();

const root_media_directory = '/usr/share/media';

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

// ======= Feed generator =======

function createRSSFeed(media_directory) {
    media_list = [];

    console.log('media_directory: ', media_directory);

    fs.readdir(media_directory, (err, files) => {
        let promise_map = files.map((file) => {
            let fileDetails = fs.lstatSync(path.resolve(media_directory, file));
            if (!fileDetails.isDirectory()) {
                item_url = `${media_directory}/${file}`
                return getChecksum(item_url);
            }
        });

        Promise.all(promise_map).then((value) => {
            const feed_base_url = `http://${server_host}:${PORT}/`;

            const feed_dir = media_directory.replace(root_media_directory, '');

            const feed_name = feed_dir.replace(/\//g, '_').replace('_', '');

            let feed = new RSS({
                title: 'NTH Screen 3 MRSS',
                description: 'MRSS feed for Brightsign player',
                feed_url: `${feed_base_url}${feed_name}_feed.xml`,
                site_url: feed_base_url,
                ttl: '1',
                custom_namespaces: {
                    'media': 'http://search.yahoo.com/mrss/'
                }
            });

            value.forEach((item) => {
                if (!item) {
                    return false;
                }
                const stats = fs.statSync(item.path);
                const mime_type = mime.getType(item.path);
                if (item && accepted_mime_types.includes(mime_type)) {
                    item_url = encodeURI(feed_base_url + item.path.replace('/usr/share/', ''));
                    media_list.push(path.basename(item.path));
                    feed.item({
                        title: path.basename(item.path),
                        guid: item.hash,
                        description: '',
                        url: item_url,
                        categories: [mime_type.split("/")[0]],
                        custom_elements: [{
                            'media:content': {
                                _attr: {
                                    url: item_url,
                                    fileSize: stats.size,
                                    type: mime_type,
                                    medium: mime_type.split("/")[0]
                                }
                            }
                        }]
                    });
                }
            });

            if (!media_list.length) {
                const nofeed_stats = fs.statSync('./public/img/no_feed.png')
                const no_feed_url = encodeURI(feed_base_url + 'img/no_feed.png')
                feed.item({
                    title: 'no_feed.png',
                    guid: 'nofeed',
                    description: '',
                    url: no_feed_url,
                    categories: ['image'],
                    custom_elements: [{
                        'media:content': {
                            _attr: {
                                url: no_feed_url,
                                fileSize: nofeed_stats.size,
                                type: 'image/png',
                                medium: 'image'
                            }
                        }
                    }]
                });
            }

            fs.writeFile(`public/${feed_name}_feed.xml`, feed.xml(), function (err) {
                if (err) {
                    console.err(err);
                }
                console.log(`public/${feed_name}_feed.xml was saved`);
            });
        })
    });
}

// ======= Watch /media folder =======

function refreshRSSFeeds() {

    const feed_directories = getDirectoriesRecursive(root_media_directory);

    feed_directories.forEach(directory => {
        createRSSFeed(directory);
    });
}

refreshRSSFeeds();

fs.watch(root_media_directory, { recursive: true }, (eventType, filename) => {
    console.log('Watch event:', eventType, 'File:', filename);
    refreshRSSFeeds();
}); 

// ======= Static web server =======

const express = require('express');
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

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

// ======= Utilities =======

function getDirectories(dirpath) {
    return fs
      .readdirSync(dirpath)
      .map(file => path.join(dirpath, file))
      .filter(
        pth =>
          fs.statSync(pth).isDirectory(),
      );
  }
  
  function getDirectoriesRecursive(dirpath) {
    return [
      dirpath,
      ...flatten(
        getDirectories(dirpath).map(getDirectoriesRecursive),
      ),
    ];
  }
  
  function flatten(arr) {
    return arr.slice().flat();
  }

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