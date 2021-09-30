class Player {
	constructor(game, options) {//로컬 플레이어라면 단순히 게임에서 패스(매개변수는 정의되지 않는다)
		this.local = true;
		let model, colour;

		this.assetsPath = 'assets/';

		const colours = ['Black', 'Brown', 'White'];
		colour = colours[Math.floor(Math.random() * colours.length)];//선택해야할 색상은 무작위로 선택

		if (options === undefined) {
			const people = ['BeachBabe', 'BusinessMan', 'Doctor', 'FireFighter', 'Housewife', 'Policeman', 'Prostitute', 'Punk', 'RiotCop', 'Roadworker', 'Robber', 'Sheriff', 'Streetman', 'Waitress'];
			model = people[Math.floor(Math.random() * people.length)];//선택해야할 모델을 무작위로 선택
		} else if (typeof options == 'object') {
			this.local = false;
			this.options = options;
			this.id = options.id;
			model = options.model;
			colour = options.colour;
		} else {
			model = options;
		}
		this.model = model;
		this.colour = colour;
		this.game = game;
		this.animations = this.game.animations;//애니메이션을 나타내는 모든 fbx파일이 로드

		const loader = new THREE.FBXLoader();
		const player = this;

		loader.load(`${game.assetsPath}fbx/people/${model}.fbx`, function (object) {

			object.mixer = new THREE.AnimationMixer(object);
			player.root = object;
			player.mixer = object.mixer;

			object.name = "Person";

			object.traverse(function (child) {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});


			const textureLoader = new THREE.TextureLoader();

			textureLoader.load(`${game.assetsPath}images/SimplePeople_${model}_${colour}.png`, function (texture) {
				object.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = texture;
					}
				});
			});

			player.object = new THREE.Object3D();
			player.object.position.set(-1000, 0, 0);
			player.object.rotation.set(0, 0, 0);


			
			// const onOK = null;
			// const btn = document.getElementById('nick-button');
			// const panel = document.getElementById('nickname');
			// if (onOK != null) {
			// 	btn.onclick = function () {
			// 		panel.style.display = 'block';
			// 	}
			// } else {
			// 	btn.onclick = function () {
			// 		panel.style.display = 'none'; //안보이게됨
			// 		var name = document.getElementById('nick-m').value;
			// 		player.addLabel(name ,game.camera.position);
			// 	}
			// }


			player.object.add(object);
			if (player.deleted === undefined) game.scene.add(player.object);

			if (player.local) {
				game.createCameras();
				game.sun.target = game.player.object;
				game.animations.Idle = object.animations[0];
				if (player.initSocket !== undefined) player.initSocket();
			} else {//로컬플레이어가 아니라면
				const geometry = new THREE.BoxGeometry(100, 300, 100);
				const material = new THREE.MeshBasicMaterial({ visible: false });
				const box = new THREE.Mesh(geometry, material);
				box.name = "Collider";
				box.position.set(0, 150, 0);
				player.object.add(box);
				player.collider = box;
				player.object.userData.id = player.id;
				player.object.userData.remotePlayer = true;//멀티플레이어의 사용자 데이터를 true
				const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);//플레이어찾아서
				game.remotePlayers.push(players[0]);//원격플레이어배열에 푸쉬
			}

			

			if (game.animations.Idle !== undefined) player.action = "Idle";
		});
	}

	set action(name) {
		//Make a copy of the clip if this is a remote player
		if (this.actionName == name) return;
		const clip = (this.local) ? this.animations[name] : THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(this.animations[name]));
		const action = this.mixer.clipAction(clip);
		action.time = 0;
		this.mixer.stopAllAction();
		this.actionName = name;
		this.actionTime = Date.now();

		action.fadeIn(0.5);
		action.play();
	}

	get action() {
		return this.actionName;
	}

	// addLabel( name, pos ) {
	// 	let fontLoader = new THREE.FontLoader();
	// 	fontLoader.load(`${this.assetsPath}font/Yanolja Yache R_Regular.json`, (font) => {
	// 		let textGeo = new THREE.TextGeometry(name,
	// 			{ 
	// 				font: font,
	// 				size: 50,
	// 				height: 0,
	// 				curveSegments: 12
	// 			}
	// 		);

	// 	// const textMaterial = new THREE.SpriteMaterial({ color: 0xffffff });
	// 	// const textMeshsp = new THREE.Sprite(textMaterial);
	// 	//const textMesh = new THREE.Mesh(textGeo, textMeshsp);
	// 	const textMaterial = new THREE.MeshBasicMaterial( { color: 0xFF00FF } );
	// 	const textMesh = new THREE.Mesh( textGeo, textMaterial );
	// 	textMesh.position.copy(pos);
	// 	textMesh.rotation.y = Math.PI / 1;
	// 	game.scene.add( textMesh );

	// 	})
	// }

	update(dt) {
		this.mixer.update(dt);

		if (this.game.remoteData.length > 0) {
			let found = false;
			for (let data of this.game.remoteData) {
				if (data.id != this.id) continue;
				//Found the player
				this.object.position.set(data.x, data.y, data.z);//플레이어가 일치하면 위치 설정
				const euler = new THREE.Euler(data.pb, data.heading, data.pb);//지정된 축으로 회전
				this.object.quaternion.setFromEuler(euler);//방향업데이트
				this.action = data.action;
				found = true;
			}
			if (!found) this.game.removePlayer(this);//특정항목 못찾을시 false로 설정된 플레이어 제거
		}
	}
}


