const fs = require('fs');
const path = require('path');

const RSS = require('rss');
const crypto = require('crypto');

const directory = './media/';
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

const local_ip_address = getIPAddress();

const feed_id = 'scr3';

const feed_base_url = 'http://' + local_ip_address + '/';

function getChecksum(path) {
    return new Promise(function (resolve, reject) {
        // crypto.createHash('sha1');
        // crypto.createHash('sha256');
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

let feed = new RSS({
    title: 'NTH Screen 3 MRSS',
    description: 'MRSS feed for Brightsign player',
    feed_url: feed_base_url + feed_id + '_feed.xml',
    ttl: '5',
    custom_namespaces: {
        'media': 'http://search.yahoo.com/mrss/'
    }
});

function createRSSFeed() {

    let promise_map = [];

    fs.readdir(directory, (err, files) => {
        promise_map = files.map((file) => {
            let fileDetails = fs.lstatSync(path.resolve(directory, file));
            // check if the file is directory 
            if (fileDetails.isDirectory()) {
                console.log('Directory: ' + file);
            } else {
                item_url = directory + file
                console.log('File: ' + item_url);
                return getChecksum(item_url);
            }
        });

        Promise.all(promise_map).then((value) => {

            let feed = new RSS({
                title: 'NTH Screen 3 MRSS',
                description: 'MRSS feed for Brightsign player',
                feed_url: feed_base_url + feed_id + '_feed.xml',
                ttl: '5',
                custom_namespaces: {
                    'media': 'http://search.yahoo.com/mrss/'
                }
            });

            value.forEach((item) => {
                console.log('item: ', item);
                feed.item({
                    title: item.path,
                    guid: item.hash,
                    description: '',
                    url: item.path
                });
            });

            fs.writeFile(feed_id + '_feed.xml', feed.xml(), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            }); 
        })
    });


}

createRSSFeed();

fs.watch('media/', (eventType, filename) => {
    console.log(eventType);
    createRSSFeed();
    // could be either 'rename' or 'change'. new file event and delete
    // also generally emit 'rename'
    console.log(filename);
})