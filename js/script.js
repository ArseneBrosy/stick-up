// Stick UP
// by Arsène Brosy
let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 2000 * canvas.clientHeight / canvas.clientWidth;

//region CONSTANTES
//endregion

//region VARIABLES
// souris
let mouseX = 0;
let mouseY = 0;
//endregion

//region FUNCTIONS
//endregion

setInterval(() => {
    //region DRAW
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //endregion
}, 0);

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});