const socket = io();
let hostStatus = document.getElementById("hostStatus");

function clickButton()
{
    socket.emit("start-pc");
}

window.onload = () => 
{
    poll();
}

function poll()
{
    socket.emit("check-host");
    hostStatus.innerHTML = `Current Host Status: <span style="color:#909090">Checking...</span>`;
}

socket.on("host-data", (status) => 
{
    if(status)
    {
        hostStatus.innerHTML = `Current Host Status: <span style="color:#00FF00">Online!</span>`;
    }
    else
    {
        hostStatus.innerHTML = `Current Host Status: <span style="color:#FF0000">Offline!</span>`;
    }
})