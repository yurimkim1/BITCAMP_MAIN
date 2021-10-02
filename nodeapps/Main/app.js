const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('../../public_html/Main/'));
app.use(express.static('../../public_html/libs'));
//app.use(express.static('../../public_html/Main/v3'));
app.get('/',function(req, res) {
    res.sendFile(__dirname + '../../public_html/Main/index.html');
});

io.sockets.on('connection', function(socket){ 											//connection안에 이벤트 작성시 socket.on('event이름', 함수) 형식
	socket.userData = { x:0, y:0, z:0, heading:0 };										//Default values; 사용자 데이터 정의
	console.log(`${socket.id} connected`);
	socket.emit('setId', { id:socket.id });//이벤트발생 함수 // 서버쪽에서 이벤트 발생시 클라이언트 페이지의 해당 이벤트 리스너 처리
	
    socket.on('disconnect', function(){
		socket.broadcast.emit('deletePlayer', { id: socket.id });//나를 제외한 전체에게 실시간 전송 // 특정 소켓 삭제
    });	

	
	// 두번째
	socket.on('chat message', function(data){
		console.log(`${data.id}님이 ${data.message}`);
		socket.broadcast.emit('chat-message',{ id: data.id, message: data.message})
		//세번째
	} )
	
	socket.on('init', function(data){
		console.log(`socket.init ${data.model} `);
		socket.userData.model = data.model;
		socket.userData.colour = data.colour;
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
		socket.userData.pb = data.pb,
		socket.userData.action = "Idle";
	});
	
	socket.on('update', function(data){//클라이언트측 소켓이 함수사용하여 업데이터할때마다 업데이트정보를 얻음
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
		socket.userData.pb = data.pb,
		socket.userData.action = data.action;
	});
	
	// socket.on('chat message', function(data){//클라이언트에서 내보내졌고 서버에 있으므로 이벤트가 아닌것으로 응답
	// 	console.log(`chat message:${data.id} ${data.message}`);
	// 	io.to(data.id).emit('chat message', { id: socket.id, message: data.message });// 특정 id에 대해 무슨 소켓 id가 무슨 메세지를 보내는지
	// })원본

	//socket.on('chat message', function(data){//클라이언트에서 내보내졌고 서버에 있으므로 이벤트가 아닌것으로 응답
		//console.log(`chat message:${data.id} ${data.message}`);
		//io.socket.emit('chat message', data);// 특정 id에 대해 무슨 소켓 id가 무슨 메세지를 보내는지
	})
//});

http.listen(2002, function(){//포트 2002에서 수신 대기중
  console.log('listening on *:2002');
});

setInterval(function(){
	const nsp = io.of('/');//namespace란게 namespace에 있는 소켓끼리만 통신(/은 default-namespace이기때문에 기본 socketio로 연결 )
    let pack = []; //배열정의
	
    for(let id in io.sockets.sockets){
        const socket = nsp.connected[id];
		//Only push sockets that have been initialised
		if (socket.userData.model!==undefined){
			pack.push({
				id: socket.id,//소켓아이디
				model: socket.userData.model,
				colour: socket.userData.colour,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				heading: socket.userData.heading,
				pb: socket.userData.pb,
				action: socket.userData.action
			});    
		}
    }
	if (pack.length>0) io.emit('remoteData', pack);// 포켓길이가 0보다 크다고 가정하고 pack배열이 서버측으로 전송
}, 40);