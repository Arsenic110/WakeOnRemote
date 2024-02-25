const http = require("http");
const fs = require("fs");
const server = http.createServer(requestListener); 
const io = require("socket.io")(server);
const wol = require("wol");

let config = require("./config.json");

const { Client, Events, GatewayIntentBits } = require('discord.js');
const token = config.discord.key;
const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

let socketConnection;
let websiteAddress = "", temps = "";

function init()
{
    client.login(token);

    //this is a kind of stupid idea, but the code is still here because I really do not want to refactor it.
    if(config.server.enabled)
    {
        //start the web server
        console.log(`Starting server on: http://${config.server.hostname}:${config.server.port}`);
        server.listen(config.server.port, config.server.hostname);
    }
    else
    {
        console.log("HTTP server disabled. Enabling Discord functionality only.");
    }


    //register socket.io connections
    io.on("connection", (socket) =>
    {
        socketConnection = socket;
        socket.on("start-pc", () => 
        {
            console.log("Start Received");
            poll((res) =>
            {
                if (res)
                {
                    console.log("Start was received, but the target is already reachable.");
                    startReceived(); //run the cmd anyway 
                }
                else
                {
                    console.log("Target offline - proceeding with start");
                    startReceived();
                }
            });
        });
        socket.on("check-host", () => 
        {
            poll(false);
        });
    })

    //initial sensor check
    getIpAndTemps();

    //start discord
    client.once(Events.ClientReady, readyClient => 
    {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    });

    client.on(Events.MessageCreate, message =>
    {
        if (message.author.bot) return false; //ignore all bots
        if (message.channel.id == config.discord.channel)
        {
            switch(message.content)
            {
                case "!web":
                    getIpAndTemps();

                    if(config.server.enabled)
                        message.reply(`Current interface address: ${websiteAddress}`);
                    else
                        message.reply(`The server functionality has been disabled. ${temps}`);
                break;
                case "!start":
                    getIpAndTemps();
                    message.reply(`Sending startup command. Good luck! ${temps}`);
                    startReceived();
                break;
            }
        }
        console.log(`Message from ${message.author.username}: ${message.content}`);
    });
}

function requestListener(req, res)
{
    console.log(req.url);

    if(req.url.includes("app.js"))
    {
        res.writeHead(200);
        res.end(fs.readFileSync("./public/js/app.js"));
    }
    else if(req.url.includes("style.css"))
    {
        res.writeHead(200);
        res.end(fs.readFileSync("./public/css/style.css"));
    }
    else if(req.url == "/")
    {
        res.writeHead(200);
        res.end(fs.readFileSync("./public/index.html"));
    }
    else
    {
        let tempFile;
        try
        {
            console.log(`Attempting to load: ${req.url}`);

            tempFile = fs.readFileSync("." + req.url);
            res.writeHead(200);
            res.end(tempFile);
        }
        catch
        {
            res.writeHead(404);
            res.end("File Not Found"); //could do with better error handling.
        }
    }
}

function poll(send)
{
    //this function attempts to ping the target computer to figure out if it's live or not. May or may not work, depending on your network.
    let pollResult = false;

    //shit i stole from stackoverflow - it exists to allow cross-compatible development between windows & linux
    let pingCommand = require('os').platform() == 'win32' ? `ping -n 1 ${config.target.ip}` : `ping -c 1 ${config.target.ip}`;

    //big yikes!
    require('child_process').exec(pingCommand, (err, stdout, stderr) =>
    {
        if(stdout.includes(`Destination host unreachable`))
        {
            console.log("Destination Host Unreachable.");
        }
        else if(stdout.includes(`Request timed out.`))
        {
            console.log("Request timed out.");
        }
        else if(stdout.includes(`(0% loss)`))
        {
            console.log("Host should be here?");
            pollResult = true;
        }
        else
        {
            console.log(stdout);
        }

        if(!send)
            socketConnection.emit("host-data", pollResult);
        else
            send(pollResult);

        return pollResult;
    });
}

function getIpAndTemps()
{
        //get ip url & temps
        http.get("http://api.ipify.org?format=json", resp =>
        {
            let data = "";
            resp.on("data", chunk => data += chunk);
    
            // The whole response has been received. Print out the result.
            resp.on("end", () => 
            {
                try
                {
                    let gpuCommand = "vcgencmd measure_temp", cpuCommand = "cat /sys/class/thermal/thermal_zone0/temp";
    
                    require('child_process').exec(cpuCommand, (err1, cpuTemp, stderr1) =>
                    {
                        if(err1 || stderr1)
                        {
                            websiteAddress = `http://${JSON.parse(data).ip}:${config.server.port}. Getting temps failed.`;
                            console.log("Getting temps failed, but not too hard. Current external address: " + websiteAddress);
                        }
                        else
                        {
                            require('child_process').exec(gpuCommand, (err2, gpuTemp, stderr2) => 
                            {
                                if(err2 || stderr2)
                                {
                                    websiteAddress = `http://${JSON.parse(data).ip}:${config.server.port}. Getting temps failed.`;
                                    console.log("Getting temps failed, but not too hard. Current external address: " + websiteAddress);
                                }
                                else
                                {
                                    websiteAddress = `http://${JSON.parse(data).ip}:${config.server.port}. CPU temp=${Number(cpuTemp) / 1000}'C GPU ${gpuTemp}`;
                                    temps = `CPU temp=${Number(cpuTemp) / 1000}'C GPU ${gpuTemp}`;
                                }
                            });
                        }
                    });
                }
                catch
                {
                    websiteAddress = `http://${JSON.parse(data).ip}:${config.server.port}. Getting temps failed.`;
                    console.log("Getting temps failed HARD. Current external address: " + websiteAddress);
                }
            });
        });
}

function startReceived()
{
    wol.wake(config.target.MAC, (err, res) => 
    {
        if(err)
        {
            console.log(err);
            return;
        }
        console.log(res);
    });
}

init();