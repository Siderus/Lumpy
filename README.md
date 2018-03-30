![Logo](docs/logo.png)

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)
[![codebeat badge](https://codebeat.co/badges/55b6d66b-3b3f-41b1-a26f-9a79209e7feb)](https://codebeat.co/projects/github-com-koalalorenzo-Orion-master) [![Build Status](https://travis-ci.org/Siderus/Orion.svg?branch=master)](https://travis-ci.org/Siderus/Orion)

# Siderus Orion - Easy and KISS desktop client for IPFS
Orion is an easy and KISS [inter planetary file system](http://ipfs.io) desktop
client. It allows you to easily add and remove files, and manage the repository,
the daemon and basic configuration.

![Screenshots](docs/main.png)

## About the project
The user should be able to manage the repository by adding, downloading and
removing files from the node using an GUI instead of CLI or web interface.

The main goals of this project are:

* Help embracing IPFS by providing an easy to use and intuitive interface.
* Help the user understanding IPFS and the decentralised web.
* Show only what is **important** to the user (Ex: the name of the
files/directory, not just CID)
* Help the user achieving their goals using IPFS instead of traditional tools (Download, upload, update)

### Features:

- [x] Manages the files pinned in the repository (Not just objects and CID)
- [x] Allows _Downloads_/_Uploads_ to the IPFS node
- [x] Integrates with OS actions like drag-and-drop or URI
- [x] Provides information and statistics about the repository and the daemon
- [x] Integrates with [Siderus](https://siderus.io/) IPFS for faster network and gateway connections
- [ ] Allows to maintain a daemon from the interface
- [ ] Integration external services/tools for encryption and content distribution

## Learn more
You can find more documentation in the following pages:

 * [How to run Orion](https://github.com/Siderus/Orion/tree/master/docs/RUN.md)
 * [How to build Orion standalone App](https://github.com/Siderus/Orion/tree/master/docs/BUILD.md)
 * ...More in [docs directory](https://github.com/Siderus/Orion/tree/master/docs)

## How To Help
Note: This project is not ready for a stable use. Help is needed!
It is developed using *Electron* and *React*, but we have a lot of things to do!

You can contribute by checking what should be done in the
[Issue Board](https://dev.siderus.io/projects/Orion/agile/board).

If you need to report something, please send an email to [hello@siderus.io](mailto:hello@siderus.io) or
contact us directly in the [chatroom on Matrix](https://riot.im/app/#/room/#Orion:matrix.org)!
