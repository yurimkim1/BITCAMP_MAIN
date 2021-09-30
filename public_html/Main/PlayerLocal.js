class PlayerLocal extends Player {// 로컬플레이어에만 적용되는 소켓
	constructor(game, model) {
		super(game, model);//생성자에서 처음에 플레이어가 볼 부모클래스 호츌

		const player = this;
		const socket = io.connect();//서버에서 소켓 처음 생성
		socket.on('setId', function (data) {//클라이어트 소켓으로 다시 돌아감
			player.id = data.id;
		});
		socket.on('remoteData', function (data) {//연결된 모든소켓에 대한 정보가 포함된 데이터
			game.remoteData = data;
		});
		socket.on('deletePlayer', function (data) {
			const players = game.remotePlayers.filter(function (player) {//원격플레이어의 원격데이터에서 다시 전달되는 id를 찾기 //remotePlayers배열은 모든 원격플레이어
				if (player.id == data.id) {//플레이어id와 데이터id가 일치시 데이터 값을 가져온다 
					return player;
				}
			});
			if (players.length > 0) {
				let index = game.remotePlayers.indexOf(players[0]);//특정플레이어를 찾는다
				if (index != -1) {
					game.remotePlayers.splice(index, 1);//원격플레이어 배열에서 특정항목에 연결
					game.scene.remove(players[0].object);//게임장면에서 해당플레이어 개체 제거
				}
			} else {//찾지 못했다면
				index = game.initialisingPlayers.indexOf(data.id);//초기화 플레이어에 여전히 있을수 있음
				if (index != -1) {
					const player = game.initialisingPlayers[index];
					player.deleted = true;//특정플레이어를 찾아 삭제된 속성을 true로 설정
					game.initialisingPlayers.splice(index, 1);//초기화가 끝날때 값이 사용될 플레이어 초기화에서 splice해준다 //splice함수는 원하는 위치에 요소를 추가하거나 삭제
				}
			}
		});

		socket.on('chat message', function (data) {//서버에서온 채팅메세지 수신에 응답
			document.getElementById('chat').style.bottom = '0px';
			const player = game.getRemotePlayerById(data.id);//해당 원격플레이어를 id를 사용하여 해당 플레이어로 가져옴
			game.speechBubble.player = player;//말풍선플레이어속성에 이 특정플레이어에게 다음과 같이 말함
			game.chatSocketId = player.id;//우리가 말하는 사람
			game.activeCamera = game.cameras.chat;
			game.speechBubble.update(data.message);//메세지로 말풍성업뎃
		});

		$('#msg-form').submit(function (e) {//화면에 채팅양싯이 있고 
			socket.emit('chat message', { id: game.chatSocketId, message: $('#m').val() });//chatSocketId와 메세지자체가 전달
			$('#m').val('');//메세지 입력상자 지우기
			return false;//리턴 false하면 페이지를 새로고침 하지 않음 클라이언트에게 보냄
		});

		this.socket = socket;
	}

	initSocket() {//플레이어가 소켓에서 완전히 초기화되면 서버로 다시 전송 initSocket는 그것을 제공
		//console.log("PlayerLocal.initSocket");
		this.socket.emit('init', {
			model: this.model,
			colour: this.colour,
			x: this.object.position.x,
			y: this.object.position.y,
			z: this.object.position.z,
			h: this.object.rotation.y,
			pb: this.object.rotation.x
		});
	}

	updateSocket() {//업데이트함수는 소켓이 움직일 때마다 그리고 간단히 업데이트 될 때마다
		if (this.socket !== undefined) {
			//console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
			this.socket.emit('update', {
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				h: this.object.rotation.y,
				pb: this.object.rotation.x,
				action: this.action
			})
		}
	}

	move(dt) {
		const pos = this.object.position.clone();
		pos.y += 60;
		let dir = new THREE.Vector3();
		this.object.getWorldDirection(dir);
		if (this.motion.forward < 0) dir.negate();
		let raycaster = new THREE.Raycaster(pos, dir);
		let blocked = false;
		const colliders = this.game.colliders;

		if (colliders !== undefined) {
			const intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) blocked = true;
			}
		}

		if (!blocked) {
			if (this.motion.forward > 0) {
				const speed = (this.action == 'Running') ? 500 : 150;
				this.object.translateZ(dt * speed);
			} else {
				this.object.translateZ(-dt * 30);
			}
		}

		if (colliders !== undefined) {
			//cast left
			dir.set(-1, 0, 0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			let intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) this.object.translateX(100 - intersect[0].distance);
			}

			//cast right
			dir.set(1, 0, 0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) this.object.translateX(intersect[0].distance - 100);
			}

			//cast down
			dir.set(0, -1, 0);
			pos.y += 200;
			raycaster = new THREE.Raycaster(pos, dir);
			const gravity = 30;

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				const targetY = pos.y - intersect[0].distance;
				if (targetY > this.object.position.y) {
					//Going up
					this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
					this.velocityY = 0;
				} else if (targetY < this.object.position.y) {
					//Falling
					if (this.velocityY == undefined) this.velocityY = 0;
					this.velocityY += dt * gravity;
					this.object.position.y -= this.velocityY;
					if (this.object.position.y < targetY) {
						this.velocityY = 0;
						this.object.position.y = targetY;
					}
				}
			} else if (this.object.position.y > 0) {
				if (this.velocityY == undefined) this.velocityY = 0;
				this.velocityY += dt * gravity;
				this.object.position.y -= this.velocityY;
				if (this.object.position.y < 0) {
					this.velocityY = 0;
					this.object.position.y = 0;
				}

			}
		}

		this.object.rotateY(this.motion.turn * dt);

		this.updateSocket();//모든 서버 측의 위치 업데이트
	}
}

