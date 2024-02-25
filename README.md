# WakeOnRemote
Small Node.JS discord bot that can send WoL magic packets to a target from a command.

## Intended Usage
It's basically intended to act as a proxy for WoL requests - if you're on the go but want to WoL your machine to later remote into it, this allows you to do that. Because it's a discord bot it also doesn't need a web interface (though, one is kinda implemented before I realised it is a bad idea) so you can use this on a home network even if you do not have a static external IP. 

## Running it
`npm install`, I guess, I dont really know how to use other peoples' node projects, I just make my own.<br>
`npm run start` to start the server. nodemon ensures the server restarts if it crashes.