var token = 0;

var bg_style = document.createElement("style");

function SetBackground() {
    bg_style.innerHTML = '.body_custom::before { background:transparent url("http://localhost:8080/api/getImage?r= ' + token++ + '") center center no-repeat; background-size: cover; }' 
    document.head.appendChild(bg_style);
}

function CacheImage() {
    $.get("http://localhost:8080/api/cacheImage", function(res) {
        if (res == "error") {
            alert("图片存储出错！");
        }
    });
}

SetBackground();