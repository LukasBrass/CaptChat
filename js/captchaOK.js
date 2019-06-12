//captchaOK

const MAX_SIZE = 900;
const PART_SIZE = 300;
const commonNumber = 10;
const uncommonNumber = 2;

var chosen;

if(imageSet) {
    chosen = imageSet
} else {
    chosen = "initial";
}

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

context.strokeRect(0, 0, MAX_SIZE, MAX_SIZE);
var counter = 0;
var usedImg = [];
var singular_x;
var singular_y;
var number;
var singular = Math.floor(Math.random() * 9 - 1 + 1);
var hint;
for (var i = 0; i < MAX_SIZE; i += PART_SIZE) {
    for (var j = 0; j < MAX_SIZE; j += PART_SIZE) {
        let img = new Image();
        let x = i;
        let y = j;
        img.onload = () => {
            context.drawImage(img, x, y, PART_SIZE, PART_SIZE);
        };
        canvas.onclick = (event) => {
            checkSingular(event)
        };
        if (counter === singular) {
            number = Math.floor(Math.random() * (uncommonNumber - 1) + 1);
            img.src = '/getsingular?repoName=' + chosen;
            singular_x = x;
            singular_y = y;

        } else {
            number = chooseNeutralCat(usedImg);
            img.src = "/img/"+chosen+"/" + number + '.jpg';
        }
        context.stroke();
        counter++;
    }
}


function checkSingular (event) {
    if (event.clientX > singular_x && event.clientX < singular_x+PART_SIZE && event.clientY > singular_y && event.clientY < singular_y+PART_SIZE) {
        i = 60;
        document.getElementsByTagName("body")[0].innerHTML = "Well done ! You can now click on ";
        var button = document.createElement("button");
        button.innerText = "This button";
        button.onclick = (event) => {
            window.top.postMessage('ok', '*');
        };
        document.getElementsByTagName("body")[0].appendChild(button);
    }
    else {
        i = i - 5;
    }
}

function chooseNeutralCat(usedImg) {
    var number = 0;
    while(number === 0 || usedImg.includes(number)) {
        number = Math.floor(Math.random() * (commonNumber - 1) +1);
    }

    usedImg.push(number);
    return number;
}


var i = 30;
var t = setInterval(runFunction, 1000);
context.font= '30px Times';

function runFunction() {
    context.clearRect(0,910,300,1100);
    var min = Math.PI*2/30;
    context.beginPath();
    context.arc(105,1000,50, 0, min*i);
    context.lineWidth = 10;
    context.stroke();
    context.fillText(i,95,1010,40);
    if(i < 0) {
        location.reload();
    }
    i--;
}

setTimeout(() => {
    $.ajax({
        url: "/singular_name",
        async: false,
        success: function(data){
            console.log(data);
            context.fillText(indices[data], 300, 1000, 550);
        }
    });
}, 200);