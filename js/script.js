// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTS
GROUND_FRICTION = 0.4;
GRAVITY = 0.3;
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
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    stick: {
        angle: 0
    },

    WIDTH: 100,
    HEIGHT: 100,
    FORCE: 10
};

let camera = {
    y: -canvas.height + player.HEIGHT / 2
}
//endregion

//region FUNCTIONS
function groundDistance() {
    return -player.y;
}

function jump() {
    if (!player.grounded) {
        return;
    }
    let forceX = Math.sin(player.stick.angle * (Math.PI/180)) * player.FORCE;
    let forceY = Math.cos(player.stick.angle * (Math.PI/180)) * player.FORCE;
    player.velocityX = forceX;
    player.velocityY = -forceY;
    player.grounded = false;
}
//endregion

setInterval(() => {
    //region PHYSICS
    player.x += player.velocityX;
    player.y += player.velocityY;

    const groundDis = groundDistance();
    if (player.velocityY > groundDis) {
        player.grounded = true;
        player.y += groundDis;
    } else {
        player.velocityY += GRAVITY;
    }
    if (player.grounded) {
        if (Math.abs(player.velocityX) < GROUND_FRICTION) {
            player.velocityX = 0;
        } else {
            player.velocityX -= player.velocityX > 0 ? GROUND_FRICTION : -GROUND_FRICTION;
        }
        player.velocityY = 0;
    }
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
    ctx.rotate(player.stick.angle * (Math.PI/180));
    ctx.fillRect(-10, -50, 20, 100);
    ctx.rotate(-player.stick.angle * (Math.PI/180));
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
    player.stick.angle = angle;
});

document.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        jump();
    }
});
