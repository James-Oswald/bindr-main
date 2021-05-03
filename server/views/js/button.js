function btnOnMouseMove(e) {
    let left = e.offsetX - 45;
    let top = e.offsetY - 45;
    e.target.querySelector(".btn-circle").style.top = top + "px";
    e.target.querySelector(".btn-circle").style.left = left + "px";
    console.log(e.target);
}
function btnOnMouseOver(e) {
    e.target.querySelector(".btn-circle").style.opacity = 1;
    e.target.querySelector(".btn-circle").style.transform = "scale(1)";
    //e.target.style.background = "#1a1a1a";
}
function btnOnMouseOut(e) {
    e.target.querySelector(".btn-circle").style.opacity = 0;
    e.target.querySelector(".btn-circle").style.transform = "scale(1.2)";
    e.target.style.background = "#fff";
}
function btnOnClick(e) {
    e.target.style.background = "#fff";
    if (e.target.querySelector(".btn-circle").style.transform === "scale(8") {
        e.target.querySelector(".btn-circle").style.transform = "scale(1)";
    } else {
        e.target.querySelector(".btn-circle").style.transform = "scale(8)";
    }
}