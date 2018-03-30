# How to build Siderus Orion
This guide will help building Siderus Orion standalone app.

## Dependencies
Orion apps requires the following dependencies installed:

* Git
* IPFS ([Install guide here](https://ipfs.io/docs/install/))
* NodeJS ([Install guide here](https://nodejs.org/en/download/package-manager/))
* Phantomjs ([official website](http://phantomjs.org/))
* Yarn (`npm install -g yarn` will do it)

Ubuntu Linux Users instead needs specific packages to be installed:

```
# apt-get install libgtkextra-dev libgconf2-dev libnss3 libasound2 libxtst-dev
```

## Clone the source
First of all you need to clone the source code and install
the modules. Run the following commands to do so:

```bash
git clone https://github.com/Siderus/Orion.git
cd ../Orion
yarn
```

## Build
To build the standalone app into its own application we need to generate the
icons files, and then generate the binary/app files. We have one script which does both:

```
yarn package
```

This process will run automatically for you, and the final application will
be available in the `./out/` directory.

## Make distributables

To make platform specific distributables for macOS, Window or Debian/Red Hat run the following
command:

```
yarn make
```

Learn more about the process here: [electronforge.io](https://electronforge.io/cli/make)
