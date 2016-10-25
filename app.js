var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};

var Entity = function() {
    var self = {
        x:250,
        y:250,
        speedX:0,
        speedY:0,
        id:"",
    }
    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.speedX;
        self.y += self.speedY;
    }
    self.getDistance = function(pt) {
        return Math.sqrt(Math.pow(self.x-pt.x, 2) + Math.pow(self.y-pt.y, 2));
    }
    return self;
}

var Player = function(id) {
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpeed = 10;
    
    var super_update = self.update;
    self.update = function() {
        self.updateSpeed();
        super_update();
        
        if(self.pressingAttack) {
            self.shootBullet(self.mouseAngle);
        }
    }
    self.shootBullet = function(angle) {
        var b = Bullet(self.id, angle);
        b.x = self.x;
        b.y = self.y;
    }
    
    self.updateSpeed = function() {
        if(self.pressingRight)
            self.speedX = self.maxSpeed;
        else if(self.pressingLeft)
            self.speedX = -self.maxSpeed;
        else
            self.speedX = 0;
            
        if(self.pressingUp)
            self.speedY = -self.maxSpeed;
        else if(self.pressingDown)
            self.speedY = self.maxSpeed;
        else
            self.speedY = 0;
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};
Player.onConnect = function(socket) {
    var player = Player(socket.id);
    socket.on('keyPress', function(data) {
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
        else if(data.inputId === 'attack')
            player.pressingAttack = data.state;
        else if(data.inputId === 'mouseAngle')
            player.mouseAngle = data.state;
    });    
}
Player.onDisconnect = function(socket) {
    delete Player.list[socket.id];
}
Player.update = function() {
	var pack = [];
	for(var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			number:player.number,
		        id:player.id
		});
	}
	return pack;
}

var Bullet = function(parent, angle) {
    var self = Entity();
    self.id = Math.random();
    self.speedX = Math.cos(angle/180*Math.PI) * 10;
    self.speedY = Math.sin(angle/180*Math.PI) * 10;
    self.angle = angle*Math.PI/180;
    self.parent = parent;
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function() {
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();
        
        for(var i in Player.list) {
            var p = Player.list[i];
            if(self.getDistance(p) < 32 && self.parent !== p.id) {
                //handle collision, ex: hp..;
                
                self.toRemove = true;
            }
        }
    }
    Bullet.list[self.id] = self;
    return self;
}

Bullet.list = {};

Bullet.update = function() {
    var pack = [];
    for(var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        if(bullet.toRemove)
            delete Bullet.list[i];
        else
            pack.push({
                x:bullet.x,
                y:bullet.y,
		angle:bullet.angle
            });
    }
    return pack;
}

var DEBUG = true;

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    var clientIP = socket.request.connection.remoteAddress;
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    socket.emit('newPlayerId', socket.id);
        
    Player.onConnect(socket);
    socket.on('disconnected', function() {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
    socket.on('sendMsgToServer', function(data) {
        var playerName = ("" + socket.id).slice(2, 7);
        for(var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
        }
    });
    socket.on('evalServer', function(data) {
        if(!DEBUG)
            return;
        var res = eval(data);
        socket.emit('evalAnswer', res);
    });
});

setInterval(function() {
    var pack = {
        player:Player.update(),
        bullet:Bullet.update()
    }
    
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/60);
