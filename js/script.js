// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTS
const DEBUG = false;
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

        HEIGHT: 121,
        WIDTH: 55,

        LEFT_JOIN: {
            x: 0.6,
            y: -0.5
        },
        RIGHT_JOIN: {
            x: -0.6,
            y: -0.3
        },
    },
    head_index: 0,

    upper_arm: {
        WIDTH: 30,
        HEIGHT: 63,
        LENGTH: 0,

        TOP_JOIN: {
            x: 0,
            y: 0.5
        },
        BOTTOM_JOIN: {
            x: 0,
            y: -0.7
        },

        CENTER_OFFSET_X: 0,
        CENTER_OFFSET_Y: 0
    },

    lower_arm: {
        WIDTH: 23,
        HEIGHT: 64,
        LENGTH: 0,

        TOP_JOIN: {
            x: 0,
            y: 0.7
        },
        BOTTOM_JOIN: {
            x: 0,
            y: -0.9
        },

        CENTER_OFFSET_X: 0,
        CENTER_OFFSET_Y: 0
    },

    WIDTH: 100,
    HEIGHT: 121,
    FORCE: 11,
    MAX_ANGLE: 50,
    LOADING_TIME: 100,
    HIT_TIME: 15,
    LOADING_DISTANCE: 50,
    HEAD_HEIGHT: 1,

    S_HEAD: [],
    S_TORSO: new Image(),
    S_STICK: new Image(),
    S_LEFT_UPPER_ARM: new Image(),
    S_LEFT_LOWER_ARM: new Image(),
    S_RIGHT_UPPER_ARM: new Image(),
    S_RIGHT_LOWER_ARM: new Image(),

    LEFT_JOIN: {
        x: 0.85,
        y: 0.67
    },
    RIGHT_JOIN: {
        x: -0.85,
        y: 0.67
    },
};
for (let i = -6; i <= 6; i++) {
    let newHead = new Image();
    newHead.src = `images/player/head/head${i}.png`;
    player.S_HEAD.unshift(newHead);
}
player.S_TORSO.src = "images/player/torso.png";
player.S_STICK.src = "images/player/stick.png";
player.S_LEFT_UPPER_ARM.src = "images/player/left-upper-arm.png";
player.S_LEFT_LOWER_ARM.src = "images/player/left-lower-arm.png";
player.S_RIGHT_UPPER_ARM.src = "images/player/right-upper-arm.png";
player.S_RIGHT_LOWER_ARM.src = "images/player/right-lower-arm.png";

const UPPER_ARM_LENGTH_X = (player.upper_arm.TOP_JOIN.x - player.upper_arm.BOTTOM_JOIN.x) * player.upper_arm.WIDTH * 0.5;
const UPPER_ARM_LENGTH_Y = (player.upper_arm.TOP_JOIN.y - player.upper_arm.BOTTOM_JOIN.y) * player.upper_arm.HEIGHT * 0.5;
player.upper_arm.LENGHT = Math.sqrt(UPPER_ARM_LENGTH_X ** 2 + UPPER_ARM_LENGTH_Y ** 2);
const LOWER_ARM_LENGTH_X = (player.lower_arm.TOP_JOIN.x - player.lower_arm.BOTTOM_JOIN.x) * player.lower_arm.WIDTH * 0.5;
const LOWER_ARM_LENGTH_Y = (player.lower_arm.TOP_JOIN.y - player.lower_arm.BOTTOM_JOIN.y) * player.lower_arm.HEIGHT * 0.5;
player.lower_arm.LENGHT = Math.sqrt(LOWER_ARM_LENGTH_X ** 2 + LOWER_ARM_LENGTH_Y ** 2);

player.upper_arm.CENTER_OFFSET_X = (player.upper_arm.TOP_JOIN.x + player.upper_arm.BOTTOM_JOIN.x) * player.upper_arm.WIDTH / 4;
player.upper_arm.CENTER_OFFSET_Y = -(player.upper_arm.TOP_JOIN.y + player.upper_arm.BOTTOM_JOIN.y) * player.upper_arm.HEIGHT / 4;
player.lower_arm.CENTER_OFFSET_X = (player.lower_arm.TOP_JOIN.x + player.lower_arm.BOTTOM_JOIN.x) * player.lower_arm.WIDTH / 4;
player.lower_arm.CENTER_OFFSET_Y = -(player.lower_arm.TOP_JOIN.y + player.lower_arm.BOTTOM_JOIN.y) * player.lower_arm.HEIGHT / 4;

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

function circlesIntersections(x1, x2, y1, y2, r1, r2, intersection) {
    const d = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
    const a = (r1**2 - r2**2 + d**2) / (2 * d);
    const h = Math.sqrt(r1**2 - a**2);
    const x3 = x1 + a * (x2 - x1) / d;
    const y3 = y1 + a * (y2 - y1) / d;
    let x, y;
    if (intersection === 0) {
        x = x3 + h * (y2 - y1) / d;
        y = y3 - h * (x2 - x1) / d;
    } else {
        x = x3 - h * (y2 - y1) / d;
        y = y3 + h * (x2 - x1) / d;
    }
    return {
        x: x,
        y: y,
    }
}
//endregion

fetch('js/level.json')
  .then((response) => response.json())
  .then((json) => level = json).then(() => {
const headWidth = player.S_HEAD[0].width * player.WIDTH / player.S_TORSO.width;
const headHeight = player.S_HEAD[0].height * headWidth / player.S_HEAD[0].width;
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

    // head index
    player.head_index = Math.round(player.stick.angle / player.MAX_ANGLE * 6) + 6;

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

    //region PLAYER
    // torso
    ctx.drawImage(player.S_TORSO, player.x - player.WIDTH / 2, player.y - player.HEIGHT - camera.y, player.WIDTH, player.HEIGHT);

    // head
    ctx.drawImage(player.S_HEAD[player.head_index], player.x - headWidth / 2, player.y - headHeight / 2 - camera.y - player.HEAD_HEIGHT * player.HEIGHT, headWidth, headHeight);

    // stick
    player.stick.offsetX = Math.sin(player.stick.angle * (Math.PI / 180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;
    player.stick.offsetY = Math.cos(player.stick.angle * (Math.PI / 180)) * player.LOADING_DISTANCE * player.stick.loadingState / player.LOADING_TIME;

    //region JOINS
    // shoulders
    const leftShoulderX = player.x + player.WIDTH * player.LEFT_JOIN.x - player.WIDTH / 2;
    const leftShoulderY = player.y - player.HEIGHT * player.LEFT_JOIN.y;
    const rightShoulderX = player.x + player.WIDTH * player.RIGHT_JOIN.x + player.WIDTH / 2;
    const rightShoulderY = player.y - player.HEIGHT * player.RIGHT_JOIN.y;

    // hands
    const stickPosX = player.x + player.stick.offsetX;
    const stickPosY = player.y - player.stick.offsetY - player.HEIGHT / 2;
    const leftHandX = stickPosX - Math.sin(player.stick.angle * (Math.PI/180)) * -player.stick.HEIGHT * player.stick.LEFT_JOIN.y / 2 + Math.cos(player.stick.angle * (Math.PI/180)) * player.stick.WIDTH * player.stick.LEFT_JOIN.x / 2;
    const leftHandY = stickPosY + Math.cos(player.stick.angle * (Math.PI/180)) * -player.stick.HEIGHT * player.stick.LEFT_JOIN.y / 2 + Math.sin(player.stick.angle * (Math.PI/180)) * player.stick.WIDTH * player.stick.LEFT_JOIN.x / 2;
    const rightHandX = stickPosX - Math.sin(player.stick.angle * (Math.PI/180)) * -player.stick.HEIGHT * player.stick.RIGHT_JOIN.y / 2 + Math.cos(player.stick.angle * (Math.PI/180)) * player.stick.WIDTH * player.stick.RIGHT_JOIN.x / 2;
    const rightHandY = stickPosY + Math.cos(player.stick.angle * (Math.PI/180)) * -player.stick.HEIGHT * player.stick.RIGHT_JOIN.y / 2 + Math.sin(player.stick.angle * (Math.PI/180)) * player.stick.WIDTH * player.stick.RIGHT_JOIN.x / 2;

    // elbows
    const leftElbow = circlesIntersections(leftShoulderX, leftHandX, leftShoulderY, leftHandY, player.upper_arm.LENGHT, player.lower_arm.LENGHT, 0);
    const rightElbow = circlesIntersections(rightShoulderX, rightHandX, rightShoulderY, rightHandY, player.upper_arm.LENGHT, player.lower_arm.LENGHT, 1);

    // centers
    const leftUpperArmCenterX = (leftShoulderX + leftElbow.x) / 2;
    const leftUpperArmCenterY = (leftShoulderY + leftElbow.y) / 2;
    const leftLowerArmCenterX = (leftHandX + leftElbow.x) / 2;
    const leftLowerArmCenterY = (leftHandY + leftElbow.y) / 2;
    const rightUpperArmCenterX = (rightShoulderX + rightElbow.x) / 2;
    const rightUpperArmCenterY = (rightShoulderY + rightElbow.y) / 2;
    const rightLowerArmCenterX = (rightHandX + rightElbow.x) / 2;
    const rightLowerArmCenterY = (rightHandY + rightElbow.y) / 2;

    // angles
    let leftUpperArmAngle = Math.atan((leftShoulderY - leftElbow.y) / (leftShoulderX - leftElbow.x)) * (180 / Math.PI);
    leftUpperArmAngle -= 90;
    if (leftShoulderX > leftElbow.x) {
        leftUpperArmAngle += 180;
    }
    let leftLowerArmAngle = Math.atan((leftHandY - leftElbow.y) / (leftHandX - leftElbow.x)) * (180 / Math.PI);
    leftLowerArmAngle += 90;
    if (leftHandX > leftElbow.x) {
        leftLowerArmAngle += 180;
    }
    let rightUpperArmAngle = Math.atan((rightShoulderY - rightElbow.y) / (rightShoulderX - rightElbow.x)) * (180 / Math.PI);
    rightUpperArmAngle -= 90;
    if (rightShoulderX > rightElbow.x) {
        rightUpperArmAngle += 180;
    }
    let rightLowerArmAngle = Math.atan((rightHandY - rightElbow.y) / (rightHandX - rightElbow.x)) * (180 / Math.PI);
    rightLowerArmAngle += 90;
    if (rightHandX > rightElbow.x) {
        rightLowerArmAngle += 180;
    }

    // sprite positions
    const leftUpperArmX = leftUpperArmCenterX - Math.sin(leftUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_Y - Math.cos(leftUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_X;
    const leftUpperArmY = leftUpperArmCenterY + Math.cos(leftUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_Y - Math.sin(leftUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_X;
    const leftLowerArmX = leftLowerArmCenterX + Math.sin(leftLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_Y - Math.cos(leftLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_X;
    const leftLowerArmY = leftLowerArmCenterY - Math.cos(leftLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_Y - Math.sin(leftLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_X;
    const rightUpperArmX = rightUpperArmCenterX - Math.sin(rightUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_Y + Math.cos(rightUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_X;
    const rightUpperArmY = rightUpperArmCenterY + Math.cos(rightUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_Y + Math.sin(rightUpperArmAngle * (Math.PI/180)) * player.upper_arm.CENTER_OFFSET_X;
    const rightLowerArmX = rightLowerArmCenterX + Math.sin(rightLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_Y + Math.cos(rightLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_X;
    const rightLowerArmY = rightLowerArmCenterY - Math.cos(rightLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_Y + Math.sin(rightLowerArmAngle * (Math.PI/180)) * player.lower_arm.CENTER_OFFSET_X;

    // draw sprites
    ctx.translate(leftUpperArmX, leftUpperArmY - camera.y);
    ctx.rotate(leftUpperArmAngle * (Math.PI / 180));
    ctx.drawImage(player.S_LEFT_UPPER_ARM, -player.upper_arm.WIDTH / 2, -player.upper_arm.HEIGHT / 2, player.upper_arm.WIDTH, player.upper_arm.HEIGHT);
    ctx.rotate(-leftUpperArmAngle * (Math.PI / 180));
    ctx.translate(-leftUpperArmX, -(leftUpperArmY - camera.y));

    ctx.translate(leftLowerArmX, leftLowerArmY - camera.y);
    ctx.rotate(leftLowerArmAngle * (Math.PI / 180));
    ctx.drawImage(player.S_LEFT_LOWER_ARM, -player.lower_arm.WIDTH / 2, -player.lower_arm.HEIGHT / 2, player.lower_arm.WIDTH, player.lower_arm.HEIGHT);
    ctx.rotate(-leftLowerArmAngle * (Math.PI / 180));
    ctx.translate(-leftLowerArmX, -(leftLowerArmY - camera.y));

    ctx.translate(rightUpperArmX, rightUpperArmY - camera.y);
    ctx.rotate(rightUpperArmAngle * (Math.PI / 180));
    ctx.drawImage(player.S_RIGHT_UPPER_ARM, -player.upper_arm.WIDTH / 2, -player.upper_arm.HEIGHT / 2, player.upper_arm.WIDTH, player.upper_arm.HEIGHT);
    ctx.rotate(-rightUpperArmAngle * (Math.PI / 180));
    ctx.translate(-rightUpperArmX, -(rightUpperArmY - camera.y));

    ctx.translate(rightLowerArmX, rightLowerArmY - camera.y);
    ctx.rotate(rightLowerArmAngle * (Math.PI / 180));
    ctx.drawImage(player.S_RIGHT_LOWER_ARM, -player.lower_arm.WIDTH / 2, -player.lower_arm.HEIGHT / 2, player.lower_arm.WIDTH, player.lower_arm.HEIGHT);
    ctx.rotate(-rightLowerArmAngle * (Math.PI / 180));
    ctx.translate(-rightLowerArmX, -(rightLowerArmY - camera.y));
    //endregion

    // stick
    ctx.translate(player.x + player.stick.offsetX, player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2);
    ctx.rotate(player.stick.angle * (Math.PI / 180));
    ctx.drawImage(player.S_STICK, -player.stick.WIDTH / 2, -player.stick.HEIGHT / 2, player.stick.WIDTH, player.stick.HEIGHT);
    ctx.rotate(-player.stick.angle * (Math.PI / 180));
    ctx.translate(-(player.x + player.stick.offsetX), -(player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2));

    if (DEBUG) {
        // hitbox
        ctx.strokeStyle = "red";
        ctx.strokeRect(player.x - player.WIDTH / 2, player.y - player.HEIGHT - camera.y, player.WIDTH, player.HEIGHT);

        // stick
        ctx.strokeStyle = "blue";
        ctx.translate(player.x + player.stick.offsetX, player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2);
        ctx.rotate(player.stick.angle * (Math.PI / 180));
        ctx.strokeRect(-player.stick.WIDTH / 2, -player.stick.HEIGHT / 2, player.stick.WIDTH, player.stick.HEIGHT);
        ctx.rotate(-player.stick.angle * (Math.PI / 180));
        ctx.translate(-(player.x + player.stick.offsetX), -(player.y - camera.y - player.stick.offsetY - player.HEIGHT / 2));

        // arms
        ctx.lineWidth = 5;
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(leftShoulderX, leftShoulderY - camera.y);
        ctx.lineTo(leftElbow.x, leftElbow.y - camera.y);
        ctx.lineTo(leftHandX, leftHandY - camera.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightShoulderX, rightShoulderY - camera.y);
        ctx.lineTo(rightElbow.x, rightElbow.y - camera.y);
        ctx.lineTo(rightHandX, rightHandY - camera.y);
        ctx.stroke();

        ctx.fillStyle = "green";
        ctx.fillRect(rightUpperArmX - 3, rightUpperArmY - 3 - camera.y, 6, 6);
        ctx.fillRect(rightUpperArmCenterX - 3, rightUpperArmCenterY - 3 - camera.y, 6, 6);
    }
    //endregion

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
