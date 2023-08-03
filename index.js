// ======= Globals =======

const fs = require('fs');
const path = require('path');

const RSS = require('rss');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server_host = process.env.HOSTNAME || getIPAddress();

const media_directory = '/usr/share/media/';

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

function createRSSFeed(feed_id) {
    
    fs.readdir(media_directory, (err, files) => {
        let promise_map = files.map((file) => {
            let fileDetails = fs.lstatSync(path.resolve(media_directory, file));
            // check if the file is directory 
            if (fileDetails.isDirectory()) {
                console.log('Directory: ' + file);
            } else {
                item_url = media_directory + file
                console.log('File: ' + item_url);
                return getChecksum(item_url);
            }
        });
        
        Promise.all(promise_map).then((value) => {
            const feed_base_url = 'http://' + server_host + ':' + PORT + '/';
            
            let feed = new RSS({
                title: 'NTH Screen 3 MRSS',
                description: 'MRSS feed for Brightsign player',
                feed_url: feed_base_url + feed_id + '_feed.xml',
                site_url: feed_base_url,
                ttl: '5',
                custom_namespaces: {
                    'media': 'http://search.yahoo.com/mrss/'
                }
            });

            value.forEach((item) => {
                console.log('item: ', item);
                item_url = feed_base_url + item.path.replace('/usr/share/', '');
                const stats = fs.statSync(item.path);
                feed.item({
                    title: path.basename(item.path),
                    guid: item.hash,
                    description: '',
                    // TODO: fix path logic because this is jank
                    url: item_url,
                    categories: ['video'],
                    custom_elements: [
                        {
                            'media:content': {
                                _attr: {
                                    url: item_url,
                                    fileSize: stats.size,
                                    type: 'video/mp4',
                                    medium: 'video'
                                }
                            }
                        }
                    ]
                });
            });

            fs.writeFile('public/' + feed_id + '_feed.xml', feed.xml(), function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        })
    });


}

createRSSFeed('scr3');

// ======= Watch /media folder =======

fs.watch(media_directory, (eventType, filename) => {
    console.log("Directory watch event:", eventType);
    createRSSFeed('scr3');
    // could be either 'rename' or 'change'. new file event and delete
    // also generally emit 'rename'
    console.log(filename);
});

// ======= Static web server =======

const express = require('express');
const app = express();

app.use(express.static('public'));
app.use('/media', express.static('../../share/media'))

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));