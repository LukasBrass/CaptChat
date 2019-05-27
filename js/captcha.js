const MAX_SIZE = 900;
const PART_SIZE = 300;
const commonNumber = 13;
const uncommonNumber = 14;

var indices = {
    "chat cosmonaute.jpg": "Saurez-vous reconnaître le chat de Thomas Pesquet ?",
    "chat myope.jpg": "Chaussez vos lunettes et montrez-moi le chat myope ?",
    "chat amoureux.jpg": "Saurez vous reconnaître un chat amoureux ?",
    "chat bien coiffe.jpg": "Mon chat est une fausse blonde",
    "chat borgne.jpg": "Ce chat là a fait une croix sur son oeil",
    "chat chapeaute.jpg": "C'est encore le chat qui porte le chapeau",
    "chat licorne.jpg": "Ne confondons pas une salicorne et un chat-licorne !",
    "chat malade.jpg": "Ce chat là a oublié de se faire vacciner contre la grippe",
    "chat moustachu.jpg": "Quel type de chat se cache derrière ses moustaches  ?",
    "chat pirate.jpg": "Après la fiancée du pirate, voici le chat du corsaire",
    "chat plongeur.jpg": "Chat du grand bleu",
    "chat princesse.jpg": "C'est la reine d'Angleterre qui a perdu son chat",
    "chat titi parisien.jpg": "Après les gilets jaunes, voici les foulards rouges",
    "chat cyclope.jpg": "Ulysse l'a trouvé lors de son voyage"
};

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

context.strokeRect(0, 0, MAX_SIZE, MAX_SIZE);
var counter = 0;
var usedImg = [];
var singular_x;
var singular_y;
var number;
var singular = Math.floor(Math.random() * 9 - 1 + 1);
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
            img.src = '/getsingular';
            singular_x = x;
            singular_y = y;
        } else {
            number = chooseNeutralCat(usedImg);
            img.src = "/img/initial/" + number + '.jpg';
        }
        context.stroke();
        counter++;
    }
}

function checkSingular (event) {
    if (event.clientX > singular_x && event.clientX < singular_x+PART_SIZE && event.clientY > singular_y && event.clientY < singular_y+PART_SIZE) {
        window.location.replace('/success');
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