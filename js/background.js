// 获取随机图片的算法

// 图片文件总数
var images_cnt = 95;

var bg_style = document.createElement("style");

function SetBackground() {
    let random_bgID = Math.floor((Math.random() * (images_cnt - 1)) + 1);
    bg_style.innerHTML = '.body_custom::before { background:transparent url("./images/' + random_bgID + '.png") center center no-repeat; background-size: cover; }' 
    document.getElementById("body").classList.add("body_custom");
    document.head.appendChild(bg_style);
}

SetBackground();