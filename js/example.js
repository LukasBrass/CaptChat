window.onmessage = function(e){
        if (e.data == 'ok') {
            let text = '';
            text += "<strong>Wow you've passed the test, you're not a robot ! </strong>";
            text += "</br><strong> You can do whatever you want using these lignes of codes : </strong>";
            text += "</br><code>window.onmessage = function(e){e.data==\"ok\"? <i>Whatever you want</i>};</code>";
            text += "</br><strong> That's all folks ! Stay connected and remember : Keep your allies close, and you enemies dead.</strong>";
        document.getElementById("iframe").innerHTML = text
    }
};