// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTS
GROUND_FRICTION = 0.4;
GRAVITY = 0.16;
STICK_GROUNDED_DISTANCE = 20;
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
    willJump: false,
    nextJumpForce: 0,
    stick: {
        angle: 0,
        offsetX: 0,
        offsetY: 0,
        loadingState: 0,
        loading: false,

        HEIGHT: 100,
        WIDTH: 20
    },

    WIDTH: 100,
    HEIGHT: 100,
    FORCE: 11,
    MAX_ANGLE: 50,
    LOADING_TIME: 100,
    HIT_TIME: 15,
    LOADING_DISTANCE: 50
};

// camera
let camera = {
    y: -canvas.height
}

// level
let level = {};

//endregion

//region FUNCTIONS
function groundDistance() {
    let distance = -player.y;
    let playerLeft = player.x - player.WIDTH / 2;
    let playerRight = player.x + player.WIDTH / 2;
    for (let wall of level.walls[0]) {
        if (wall.y1 <= -player.y + 5 && wall.x1 < playerRight && wall.x2 > playerLeft) {
            let groundDistance = -player.y - wall.y1;
            distance = Math.min(groundDistance, distance);
        }
    }
    return distance;
}

function ceilingDistance() {
    let distance = Infinity;
    let playerLeft = player.x - player.WIDTH / 2;
    let playerRight = player.x + player.WIDTH / 2;
    for (let wall of level.walls[0]) {
        if (wall.y2 >= -player.y + player.HEIGHT - 5 && wall.x1 < playerRight && wall.x2 > playerLeft) {
            let ceilingDistance = wall.y2 + player.y - player.HEIGHT;
            distance = Math.min(ceilingDistance, distance);
        }
    }
    return distance;
}

function stickGrounded() {
    let stickPosX = player.x + player.stick.offsetX;
    let stickPosY = player.y - player.stick.offsetY - player.HEIGHT / 2;
    let stickEndX = stickPosX - Math.sin(player.stick.angle * (Math.PI/180)) * player.stick.HEIGHT / 2;
    let stickEndY = stickPosY + Math.cos(player.stick.angle * (Math.PI/180)) * player.stick.HEIGHT / 2;
    let distance = -stickEndY;
    for (let wall of level.walls[0]) {
        if (wall.y1 <= -stickEndY + 5 && wall.x1 < stickEndX + player.stick.WIDTH * 0.8 && wall.x2 > stickEndX - player.stick.WIDTH * 0.8) {
            let groundDistance = -stickEndY - wall.y1;
            distance = Math.min(groundDistance, distance);
        }
    }
    return distance <= STICK_GROUNDED_DISTANCE;
}

function wallDistance() {
    if (player.velocityX > 0) {
        let distance = 2000 - player.x - player.WIDTH / 2;
        let playerTop = player.y - player.HEIGHT;
        let playerRight = player.x + player.WIDTH / 2;
        for (let wall of level.walls[0]) {
            if (wall.x1 >= playerRight && wall.y1 > -player.y && wall.y2 < -playerTop) {
                let wallDistance = wall.x1 - playerRight;
                distance = Math.min(wallDistance, distance);
            }
        }
        return distance;
    }
    if (player.velocityX < 0) {
        let distance = player.x - player.WIDTH / 2;
        let playerTop = player.y - player.HEIGHT;
        let playerLeft = player.x - player.WIDTH / 2;
        for (let wall of level.walls[0]) {
            if (wall.x2 <= playerLeft && wall.y1 > -player.y && wall.y2 < -playerTop) {
                let wallDistance = playerLeft - wall.x2;
                distance = Math.min(wallDistance, distance);
            }
        }
        return distance;
    }
    return 0;
}

function jump() {
    player.stick.loading = false;
    if (!player.grounded || !stickGrounded()) {
        return;
    }
    let forceX = Math.sin(player.stick.angle * (Math.PI/180)) * player.nextJumpForce;
    let forceY = Math.cos(player.stick.angle * (Math.PI/180)) * player.nextJumpForce;
    player.velocityX = forceX;
    player.velocityY = -forceY;
    player.grounded = false;
}
//endregion

fetch('js/level.json')
  .then((response) => response.json())
  .then((json) => level = json).then(() =>
setInterval(() => {
    //region PHYSICS
    // stick angle
    let dirX = mouse.x - player.x;
    let dirY = mouse.y - (player.y - camera.y);

    let angle = Math.atan(dirY/dirX)*(180/Math.PI);
    angle += 90;
    if (dirX < 0) {
        angle -= 180;
    }
    if (player.stick.loadingState === 0) {
        player.stick.angle = angle;
    }

    // stick clamp angle
    player.stick.angle = Math.min(Math.max(player.stick.angle, -player.MAX_ANGLE), player.MAX_ANGLE);

    // stick loading
    if (player.stick.loading) {
        player.stick.loadingState ++;
    } else {
        player.stick.loadingState -= player.LOADING_TIME / player.HIT_TIME;
    }
    player.stick.loadingState = Math.min(Math.max(player.stick.loadingState, 0), player.LOADING_TIME);

    // jump
    if (player.stick.loadingState <= 0 && player.willJump) {
        player.willJump = false;
        jump();
    }

    // gravity
    const groundDis = groundDistance();
    const ceilingDis = ceilingDistance();
    if (player.velocityY > groundDis) {
        player.grounded = true;
        player.y += groundDis;
        player.velocityY = 0;
    } else if (-player.velocityY > ceilingDis) {
        player.y -= ceilingDis;
        player.velocityY = 0;
    } else {
        player.velocityY += GRAVITY;
        player.y += player.velocityY;
    }

    // friction
    if (player.grounded) {
        if (Math.abs(player.velocityX) < GROUND_FRICTION) {
            player.velocityX = 0;
        } else {
            player.velocityX -= player.velocityX > 0 ? GROUND_FRICTION : -GROUND_FRICTION;
        }
    }

    // velocity X
    const wallDis = wallDistance();
    if (Math.abs(player.velocityX) > wallDis) {
        player.x += player.velocityX > 0 ? wallDis : -wallDis;
        player.velocityX *= -1;
    } else {
        player.x += player.velocityX;
    }
    //endregion

    //region DRAW
    // clear
    canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;
    camera.y = -canvas.height;

    // walls
    ctx.fillStyle = "black"
    for (let wall of level.walls[0]) {
        ctx.fillRect(wall.x1, -camera.y - wall.y1, wall.x2 - wall.x1, wall.y1 - wall.y2);
    }

    // player
    ctx.fillStyle = "red";
    ctx.fillRect(player.x - player.WIDTH / 2, player.y - player.HEIGHT - camera.y, player.WIDTH, player.HEIGHT);

    // stick
    ctx.fillStyle = "blue";
    player.stick.offsetX = Math.sin(player.stick.angle * (Math.PI/180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;
    player.stick.offsetY = Math.cos(player.stick.angle * (Math.PI/180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;
    ctx.translate(player.x + player.stick.offsetX, player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2);
    ctx.rotate(player.stick.angle * (Math.PI/180));
    ctx.fillRect(-player.stick.WIDTH / 2, -player.stick.HEIGHT / 2, player.stick.WIDTH, player.stick.HEIGHT);
    ctx.rotate(-player.stick.angle * (Math.PI/180));
    ctx.translate(-(player.x + player.stick.offsetX), -(player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2));

    //endregion
}, 0));

document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / canvas.clientWidth * canvas.width;
    mouse.y = e.clientY / canvas.clientHeight * canvas.height;
});

document.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        player.stick.loading = true;
    }
});

document.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        player.nextJumpForce = player.FORCE * player.stick.loadingState / player.LOADING_TIME;
        player.stick.loading = false;
        player.willJump = true;
    }
});
