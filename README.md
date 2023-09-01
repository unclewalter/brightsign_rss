# Brightsign MRSS generator

This is a simple app designed to take the contents of a folder and generate a Media RSS feed for the content with the correct custom RSS elements for Brightsign players to consume. 

## Operation

- The app watches the `/media` folder for any changes.
- When a change is detected, each file in the each subdirectory of the media player is enumerated and is given a unique GUID based on a MD5 hash of the file. This ensures any new files or changed files are updated on the player, but anything that is the same isn't unncessarily re-downloaded
- A MRSS feed file is generated using this metadata for each subfolder in the `/media` folder
- The media and the feed XML are statically served using Express – So video files stored in `/media/northcote/scr2` for instance would be reflected the feed `http://<hostname>:<port>/northcote_scr2_feed.xml` as the feed names are just the source media directories with the `/` delimiter replaced with an underscore so the feeds are kept in a single folder.

At this point. It currently supports video and image assets already in the correct format. There may be later plans to serve other assets such as images and HTML. But at this point the focus is on getting video content reliably pushed to the players.

## Setup

Edit `HOSTNAME` and `PORT` environment variables in the docker-compose.yml to match your the hostname of your Docker container.

You will also need to provision storage volumes for `brightsign_rss` and `filebrowser` containers and configure them in `docker-compose.yml`

From here you can either deploy to a container hosting service like Amazon ECS, Azure ACI or run locally by invoking `docker compose up --build` on your local machine, provided you have Docker and Docker Compose installed.

You may decide to use a different file management method. You just need to sub out `filebrowser` in `docker-compose.yml` file for your app of choice. As long as what you replace it with presents the files in a Docker volume, this app should be able to consume it.

## TODO

- Add function to clear orphan feeds
- Possibly add ffmpeg integration to transcode media for target
- Possible add imagemagick integration to resize oversized images