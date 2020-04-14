# Zipcall - Decentralized Video Chat

[![Author](https://img.shields.io/badge/Author-ianramzy-brightgreen.svg)](https://ianramzy.com)
![License: CC-NC](https://img.shields.io/badge/License-CCNC-blue.svg)
[![Donate](https://img.shields.io/badge/Donate-PayPal-brightgreen.svg)](https://paypal.me/ianramzy)
[![Repo Link](https://img.shields.io/badge/Repo-Link-black.svg)](https://github.com/ianramzy/decentralized-video-chat)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?)](https://github.com/prettier/prettier)
[![Join the chat at https://gitter.im/zipcall](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/zipcall)

# https://zipcall.io

Decentralized video chat platform powered by WebRTC using Twilio STUN/TURN infrastructure.
Zipcall provides video quality and latency simply not available with traditional
technology.

![screenshot](public/images/readmecall.png "Video Calling")

## Features

<img align="right" width="400" height="auto" src="public/images/preview.gif">

- Screen sharing
- Picture in picture
- Live captions
- Text chat
- Auto-scaling video quality
- No download required, entirely browser based
- Direct peer to peer connection ensures lowest latency
- Single use disposable chat rooms

## Quick start

- You will need to have Node.js installed, this project has been tested with Node version 10.X and 12.X
- Clone this repo

```
git clone https://github.com/ianramzy/decentralized-video-chat
cd decentralized-video-chat
```

#### Set up credentials

- Rename .env.template to .env
- Sign up for free twilio account https://www.twilio.com/login
- Get your Account SID and Auth Token from the Twillio console
- Fill in your credentials in the .env file

#### Install dependencies

```
npm install
```

#### Start the server

```
npm start
```

- Open `localhost:3000` in browser
- If you want to use a client on another computer/network, make sure you publish your server on an HTTPS connection.
  You can use a service like [ngrok](https://ngrok.com/) for that.

## Contributing

Pull Requests are welcome!

Please run prettier on all of your PRs before submitting, this can be done with `prettier --write` in the project directory

For communication we use Gitter Chat which can be found here: [![Join the chat at https://gitter.im/zipcall](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/zipcall)
