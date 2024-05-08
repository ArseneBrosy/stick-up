// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTS
//endregion

//region VARIABLES
// mouse
let mouse = {
    x: 0,
    y: 0
};

// player
let player = {
    x: canvas.width / 2,
    y: 0,
    stickAngle: 0,

    WIDTH: 100,
    HEIGHT: 100
};

let camera = {
    y: -canvas.height + player.HEIGHT / 2
}
//endregion

//region FUNCTIONS
//endregion

setInterval(() => {
    //region PHYSICS
    //endregion

    //region DRAW
    // clear
    canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;
    camera.y = -canvas.height + player.HEIGHT / 2;

    // player
    ctx.fillStyle = "red";
    ctx.fillRect(player.x - player.WIDTH / 2, player.y - player.HEIGHT / 2 - camera.y, player.WIDTH, player.HEIGHT);

    // stick
    ctx.fillStyle = "blue";
    ctx.translate(player.x, player.y - camera.y);
    ctx.rotate(player.stickAngle * (Math.PI/180));
    ctx.fillRect(-10, -50, 20, 100);
    ctx.rotate(-player.stickAngle * (Math.PI/180));
    ctx.translate(-player.x, -player.y - camera.y);

    //endregion
}, 0);

document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / canvas.clientWidth * canvas.width;
    mouse.y = e.clientY / canvas.clientHeight * canvas.height;

    let dirX = mouse.x - player.x;
    let dirY = mouse.y - (player.y - camera.y);

    let angle = Math.atan(dirY/dirX)*(180/Math.PI);
    angle += 90;
    if (dirX < 0) {
        angle -= 180;
    }
    player.stickAngle = angle;
});

document.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        let forceY = Math.cos(player.stickAngle * (Math.PI/180));
        let forceX = Math.sin(player.stickAngle * (Math.PI/180));
        console.log(forceX + " : " + forceY);
    }
});
