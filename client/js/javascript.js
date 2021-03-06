
function drawRotatedImage(img, x, y, w, h, centerX, centerY, rot) {
    ctx.save();
    var midX = x + (w / 2.0) + centerX;
    var midY = y + (h / 2.0) + centerY;
    ctx.translate(midX, midY);
    ctx.rotate(rot);		   
    ctx.drawImage(img, x-midX, y-midY, w, h);
    ctx.restore();
}

var DamageText = function() {
    var self = {
	x:0,
	y:0,
	time:0,
	maxtime:10,
	dmg:0
    }
    return self;
}

var damageTexts = new Array();

var currentMap = null;

var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var ctx = document.getElementById("ctx").getContext("2d");

var characterimage = new Array(4);

characterimage[0] = new Image();
characterimage[0].src = '/client/img/character_down.png';

characterimage[1] = new Image();
characterimage[1].src = '/client/img/character_right.png';

characterimage[2] = new Image();
characterimage[2].src = '/client/img/character_up.png';

characterimage[3] = new Image();
characterimage[3].src = '/client/img/character_left.png';

var bulletimage = new Image();
bulletimage.src = '/client/img/admin_weapon.png';

var background = new Image();
background.src = '/client/img/bg.png';

ctx.font = '26px Courier New';

var socket = io();
var myId = 0.0;
var cameraX = 0;
var cameraY = 0;
var mouseX = 0;
var mouseY = 0;

socket.on('newPlayerId', function(data) {
    myId = data;
});

socket.on('mapUpdate', function(data) {
    currentMap = data;
});

socket.on('damageText', function(data) {
    damageTexts.push(data);
});

socket.on('update', function(data) {
    
    ctx.clearRect(0, 0, 1152, 768);

    if (currentMap !== null) {
        for (var x = 0; x < currentMap.width; ++x) {
            for (var y = 0; y < currentMap.height; ++y) {
		if ((x+1)*50 > cameraX && x*50 < cameraX+1152 && (y+1)*50 > cameraY && y*50 < cameraY+768)        {
		    ctx.drawImage(background, x*50-cameraX, y*50-cameraY);
		}
            }
        }
    }

    for(var i = 0; i < data.player.length; i++) {
        ctx.drawImage(characterimage[data.player[i].direction], data.player[i].x - cameraX, data.player[i].y - cameraY, 50, 70);
	if (data.player[i].id === myId) {
	    drawRotatedImage(bulletimage, data.player[i].x - cameraX + 17, data.player[i].y - cameraY + 35, 20, 22.5, -4, 0, Math.atan2(mouseY, mouseX));
	    ctx.font = '20px Courier New';
	    cameraX = data.player[i].x - 530;
	    cameraY = data.player[i].y - 370;
	    ctx.fillStyle = '#000000';
	    
	    // Text to health and exp
            ctx.fillText("hp:", 10, 28);
            ctx.fillText("exp:", 10, 58);
            
            // black rectangle HEALTH
	    ctx.fillRect(60, 14, 128, 16);
	    ctx.fillRect(64, 10, 120, 24);
	    
	    // black rectangle EXP
	    ctx.fillRect(60, 45, 128, 16);
	    ctx.fillRect(64, 41, 120, 24);
	    
	    
	    var hpWidth = 115 * data.player[i].hp / data.player[i].hpMax;
	    ctx.fillStyle='#FF0000';
            ctx.fillRect(66, 18, hpWidth, 9);
            ctx.fillStyle='#FFFFFF';
            ctx.fillRect(66, 19, hpWidth, 1);
            
            var xpWidth = 115 * data.player[i].xp / data.player[i].xpMax;
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(66, 48, xpWidth, 9);
            ctx.fillStyle='#FFFFFF';
            ctx.fillRect(66, 49, xpWidth, 1);
            
            ctx.fillStyle = '#FF3399';
            
            var levels = "lvl:" + data.player[i].level;
            ctx.fillText(levels, 10, 90);
            if (xpWidth >= 115) {
                data.player[i].level
            }
            ctx.fillText(Math.ceil(data.player[i].hp), 200, 28);
        }
    }
    
    for(var i = 0; i < data.bullet.length; i++) {
        //ctx.fillRect(data.bullet[i].x-5-cameraX, data.bullet[i].y-5-cameraY, 10, 10);
	ctx.save();
	var midX = data.bullet[i].x+25-cameraX;
	var midY = data.bullet[i].y+22-cameraY;
	ctx.translate(midX, midY);
	ctx.rotate(data.bullet[i].angle);		   
	ctx.drawImage(bulletimage, data.bullet[i].x-5-cameraX-midX, data.bullet[i].y-5-cameraY-midY, 40, 45);
	ctx.restore();
    }
    
    ctx.font = '30px Comic Sans MS';
    for(var i = 0; i < damageTexts.length; i++) {
	ctx.fillText(Math.ceil(damageTexts[i].dmg), damageTexts[i].x - cameraX, damageTexts[i].y - cameraY - damageTexts[i].time);
	damageTexts[i].time += 1;		   
    }
    
    damageTexts = damageTexts.filter(function(dmgText) {
	return dmgText.time < dmgText.maxtime;
    });
    
});

socket.on('addToChat', function(data) {
    chatText.innerHTML += '<div>' + data + '</div>';
});
socket.on('evalAnswer', function(data) {
    console.log(data);
});

chatForm.onsubmit = function(e) {
    e.preventDefault();
    if(chatInput.value[0] === '/')
        socket.emit('evalServer', chatInput.value.slice(1));
    else
        socket.emit('sendMsgToServer', chatInput.value);
    chatInput.value = '';
}

document.onkeydown = function(event) {
    if(event.keyCode === 68) //d
        socket.emit('keyPress', {inputId:'right', state:true});
    else if(event.keyCode === 83) //s
        socket.emit('keyPress', {inputId:'down', state:true});
    else if(event.keyCode === 65) //a
        socket.emit('keyPress', {inputId:'left', state:true});
    else if(event.keyCode === 87) //w
        socket.emit('keyPress', {inputId:'up', state:true});
}
document.onkeyup = function(event) {
    if(event.keyCode === 68) //d
        socket.emit('keyPress', {inputId:'right', state:false});
    else if(event.keyCode === 83) //s
        socket.emit('keyPress', {inputId:'down', state:false});
    else if(event.keyCode === 65) //a
        socket.emit('keyPress', {inputId:'left', state:false});
    else if(event.keyCode === 87) //w
        socket.emit('keyPress', {inputId:'up', state:false});
}

document.onmousedown = function(event) {
    socket.emit('keyPress', {inputId:'attack', state:true});
}
document.onmouseup = function(event) {
    socket.emit('keyPress', {inputId:'attack', state:false});
}
document.onmousemove = function(event) {
    var x = -530 + event.clientX - 8;
    var y = -370 + event.clientY -8;
    mouseX = x;
    mouseY = y;
    var angle = Math.atan2(y, x) / Math.PI * 180;
    socket.emit('keyPress', {inputId:'mouseAngle', state:angle});
}
