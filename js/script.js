// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTS
const GROUND_FRICTION = 0.4;
const GRAVITY = 0.16;
const STICK_GROUNDED_DISTANCE = 40;
const COMPUTED_REGION_HEIGHT = 500;
const CAMERA_ZONE_TOP = 0.5;
const CAMERA_ZONE_BOTTOM = 0.25;
const CAMERA_SPEED = 6;
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
};

// particles
let particles = [];

// level
let level = {};
let computedWalls = [];
let computedRegionBottom = 0;
let computedRegionTop = COMPUTED_REGION_HEIGHT;

// deltatime
let fpsCounter = 0;
let deltatime = 1;
//endregion

//region FUNCTIONS
function groundDistance(x = player.x, y = player.y, margin = player.WIDTH / 2) {
    let distance = -y;
    let playerLeft = x - margin;
    let playerRight = x + margin;
    for (let wall of computedWalls) {
        if (wall.y1 <= -y + 20 && wall.x1 < playerRight && wall.x2 > playerLeft) {
            let groundDistance = -y - wall.y1;
            distance = Math.min(groundDistance, distance);
        }
    }
    return distance;
}

function ceilingDistance() {
    let distance = Infinity;
    let playerLeft = player.x - player.WIDTH / 2;
    let playerRight = player.x + player.WIDTH / 2;
    for (let wall of computedWalls) {
        if (wall.y2 >= -player.y + player.HEIGHT - 20 && wall.x1 < playerRight && wall.x2 > playerLeft) {
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
    for (let wall of computedWalls) {
        if (wall.y1 <= -stickEndY + 20 && wall.x1 < stickEndX + player.stick.WIDTH * 0.8 && wall.x2 > stickEndX - player.stick.WIDTH * 0.8) {
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
        for (let wall of computedWalls) {
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
        for (let wall of computedWalls) {
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

function refreshComputedRegion() {
    computedWalls = [];
    for (let wall of level.walls) {
        if (wall.y2 <= computedRegionTop + COMPUTED_REGION_HEIGHT && wall.y1 >= computedRegionBottom - COMPUTED_REGION_HEIGHT) {
            computedWalls.push(wall);
        }
    }
}

function spawnParticles(number = 7, randomVelocityX = 2.5, randomVelocityY = 3, randomSize = [5, 15], randomLifespan = [50, 200]) {
    for (let i = 0; i < number; i++) {
        particles.push({
            x: player.x,
            y: player.y - 10,
            velocityX: Math.random() * randomVelocityX * 2 - randomVelocityX,
            velocityY: -Math.random() * randomVelocityY,
            color: "black",
            size: Math.random() * (randomSize[1] - randomSize[0]) + randomSize[0],
            ttl: Math.random() * (randomLifespan[1] - randomLifespan[0]) + randomLifespan[0],
            lifespan: Math.random() * (randomLifespan[1] - randomLifespan[0]) + randomLifespan[0]
        });
    }
}
//endregion

fetch('js/level.json')
  .then((response) => response.json())
  .then((json) => level = json).then(() => {
setInterval(() => {
    //region COMPUTED WALLS
    if (-player.y < computedRegionBottom) {
        computedRegionBottom -= COMPUTED_REGION_HEIGHT;
        computedRegionTop -= COMPUTED_REGION_HEIGHT;
        refreshComputedRegion();
    }
    if (-player.y > computedRegionTop) {
        computedRegionBottom += COMPUTED_REGION_HEIGHT;
        computedRegionTop += COMPUTED_REGION_HEIGHT;
        refreshComputedRegion();
    }
    //endregion

    //region CAMERA
    const worldCameraZoneTop = camera.y + canvas.height * (1 - CAMERA_ZONE_TOP);
    const worldCameraZoneBottom = camera.y + canvas.height * (1 - CAMERA_ZONE_BOTTOM);
    const worldCameraZoneHeight = worldCameraZoneTop - worldCameraZoneBottom;
    const cameraZoneRelativePlayer = (player.y - worldCameraZoneBottom) / worldCameraZoneHeight;
    if (player.y < worldCameraZoneTop) {
        camera.y -= worldCameraZoneTop - player.y;
    }
    else if (player.y > worldCameraZoneBottom - worldCameraZoneHeight) {
        camera.y -= (worldCameraZoneBottom - worldCameraZoneHeight) - player.y;
    }
    else {
        camera.y -= cameraZoneRelativePlayer * CAMERA_SPEED * deltatime;
    }
    camera.y = Math.min(camera.y, -canvas.height);
    //endregion

    //region PHYSICS
    // deltatime
    fpsCounter++;

    // stick angle
    let dirX = mouse.x - player.x;
    let dirY = mouse.y - (player.y - camera.y);

    let angle = Math.atan(dirY / dirX) * (180 / Math.PI);
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
        player.stick.loadingState += deltatime;
    } else {
        player.stick.loadingState -= player.LOADING_TIME / player.HIT_TIME * deltatime;
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
    if (player.velocityY * deltatime > groundDis) {
        player.grounded = true;
        player.y += groundDis;
        player.velocityY = 0;
        spawnParticles();
    } else if (-player.velocityY * deltatime > ceilingDis) {
        player.y -= ceilingDis;
        player.velocityY = 0;
    } else if (!player.grounded) {
        player.velocityY += GRAVITY * deltatime;
        player.y += player.velocityY * deltatime;
    }

    // friction
    if (player.grounded) {
        if (Math.abs(player.velocityX * deltatime) < GROUND_FRICTION) {
            player.velocityX = 0;
        } else {
            let direction = player.velocityX < 0;
            player.velocityX -= (player.velocityX > 0 ? GROUND_FRICTION : -GROUND_FRICTION) * deltatime;
            if (player.velocityX < 0 !== direction) {
                player.velocityX = 0;
            }
        }
    }

    // velocity X
    const wallDis = wallDistance();
    if (Math.abs(player.velocityX * deltatime) > wallDis) {
        player.x += player.velocityX > 0 ? wallDis : -wallDis;
        player.velocityX *= -1;
    } else {
        player.x += player.velocityX * deltatime;
    }

    for (let particle of particles) {
        // gravity
        const groundDis = groundDistance(particle.x, particle.y, particle.size / 2);
        if (particle.velocityY * deltatime > groundDis) {
            particle.y += groundDis;
            particle.velocityY = 0;
        }  else if (particle.velocityY !== 0) {
            particle.velocityY += GRAVITY * deltatime;
            particle.y += particle.velocityY * deltatime;
        }

        // friction
        if (particle.velocityY === 0) {
            if (Math.abs(particle.velocityX * deltatime) < GROUND_FRICTION) {
                particle.velocityX = 0;
            } else {
                let direction = particle.velocityX < 0;
                particle.velocityX -= (particle.velocityX > 0 ? GROUND_FRICTION : -GROUND_FRICTION) * deltatime;
                if (particle.velocityX < 0 !== direction) {
                    particle.velocityX = 0;
                }
            }
        }

        // velocity X
        particle.x += particle.velocityX * deltatime;
    }
    //endregion

    //region DRAW
    // clear
    canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

    // walls
    ctx.fillStyle = "black"
    for (let wall of computedWalls) {
        ctx.fillRect(wall.x1, -camera.y - wall.y1, wall.x2 - wall.x1, wall.y1 - wall.y2);
    }

    // player
    ctx.fillStyle = "red";
    ctx.fillRect(player.x - player.WIDTH / 2, player.y - player.HEIGHT - camera.y, player.WIDTH, player.HEIGHT);

    // stick
    ctx.fillStyle = "blue";
    player.stick.offsetX = Math.sin(player.stick.angle * (Math.PI / 180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;
    player.stick.offsetY = Math.cos(player.stick.angle * (Math.PI / 180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;
    ctx.translate(player.x + player.stick.offsetX, player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2);
    ctx.rotate(player.stick.angle * (Math.PI / 180));
    ctx.fillRect(-player.stick.WIDTH / 2, -player.stick.HEIGHT / 2, player.stick.WIDTH, player.stick.HEIGHT);
    ctx.rotate(-player.stick.angle * (Math.PI / 180));
    ctx.translate(-(player.x + player.stick.offsetX), -(player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2));

    // particles
    for (let particle of particles) {
        ctx.fillStyle = particle.color;
        const particleSize = particle.size * particle.ttl / particle.lifespan;
        ctx.fillRect(particle.x - particleSize / 2, particle.y - camera.y - particleSize / 2, particleSize, particleSize);
        particle.ttl -= deltatime;
        if (particle.ttl <= 0) {
            particles.splice(particles.indexOf(particle), 1);
        }
    }

    /*// computed region
    ctx.fillStyle = "green";
    ctx.fillRect(0, -camera.y - computedRegionTop, canvas.width, 2);
    ctx.fillRect(0, -camera.y - computedRegionBottom, canvas.width, 2);
    ctx.fillStyle = "blue";
    ctx.fillRect(0, -camera.y - (computedRegionTop + COMPUTED_REGION_HEIGHT), canvas.width, 2);
    ctx.fillRect(0, -camera.y - (computedRegionBottom - COMPUTED_REGION_HEIGHT), canvas.width, 2);*/

    /*// camera zone
    ctx.fillStyle = "yellow";
    ctx.fillRect(0, canvas.height - canvas.height * CAMERA_ZONE_TOP, canvas.width, 2);
    ctx.fillRect(0, canvas.height - canvas.height * CAMERA_ZONE_BOTTOM, canvas.width, 2);*/

    //endregion
}, 0);
refreshComputedRegion();
});

setInterval(() => {
    deltatime = 25 / fpsCounter;
    fpsCounter = 0;
}, 100);

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
