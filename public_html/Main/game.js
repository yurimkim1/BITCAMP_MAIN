class Game {
	constructor() {
		if (!Detector.webgl) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE: Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING: Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;

		this.container;
		this.player;
		this.cameras;
		this.camera;
		this.scene;
		this.renderer;
		this.animations = {};
		this.assetsPath = 'assets/';
		this.textMesh;

		this.colliders = [];
		this.remotePlayers = [];
		this.remoteColliders = [];
		this.initialisingPlayers = [];
		this.remoteData = [];

		this.messages = {
			text: [
				"Welcome to Blockland",
				"GOOD LUCK!"
			],
			index: 0
		}

		this.container = document.createElement('div');
		this.container.id = 'main_div';
		this.container.style.height = '100%';
		document.body.appendChild(this.container);

		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
		

		const game = this;

		
		this.anims = ['Walking', 'Walking Backwards', 'Turn', 'Running', 'Pointing', 'Talking', 'Pointing Gesture'];

		const options = {
			assets: [
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`,
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`,
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`,
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`,
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`,
				`${this.assetsPath}images/KakaoTalk_20210916_195442737.png`
			],
			oncomplete: function () {
				game.init();
			}
		}

		this.anims.forEach(function (anim) { options.assets.push(`${game.assetsPath}fbx/anims/${anim}.fbx`) });
		//options.assets.push(`${game.assetsPath}fbx/town.fbx`);

		this.mode = this.modes.PRELOAD;

		this.clock = new THREE.Clock();

		const preloader = new Preloader(options);

		window.onError = function (error) {
			console.error(JSON.stringify(error));
		}
	}

	initSfx() {
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		this.sfx.gliss = new SFX({
			context: this.sfx.context,
			src: { mp3: `${this.assetsPath}sfx/gliss.mp3`, ogg: `${this.assetsPath}sfx/gliss.ogg` },
			loop: false,
			volume: 0.3
		});
	}

	set activeCamera(object) {
		this.cameras.active = object;
	}

	// addLabel( name ) {
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
	// 	textMesh.rotation.y = Math.PI / 1;
	// 	//textMesh = new THREE.Object3D();
	// 	//textMesh.parent = this.player.object;
	// 	this.scene.add( textMesh );
	// 	})
	// }
	  
	init() {
		this.mode = this.modes.INITIALISING;

		this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x00a0f0);

		const ambient = new THREE.AmbientLight(0xaaaaaa);
		this.scene.add(ambient);

		const light = new THREE.DirectionalLight(0xaaaaaa);
		light.position.set(30, 100, 40);
		light.target.position.set(0, 0, 0);

		light.castShadow = true;

		const lightSize = 500;
		light.shadow.camera.near = 1;
		light.shadow.camera.far = 500;
		light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
		light.shadow.camera.right = light.shadow.camera.top = lightSize;

		light.shadow.bias = 0.0039;
		light.shadow.mapSize.width = 1024;
		light.shadow.mapSize.height = 1024;

		this.sun = light;
		this.scene.add(light);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild(this.renderer.domElement);


		// model
		const game = this;

		this.player = new PlayerLocal(this);//플레이어는 플레이어로컬클래스가 단순히 매개변수로 게임을 전달
		const loader = new THREE.FBXLoader();
		this.loadEnvironment(loader);

		// this.speechBubble = new SpeechBubble(this, "", 150);
		// this.speechBubble.mesh.position.set(0, 350, 0);

		this.nickname = new Nickname(this, "");
		this.nickname.mesh.position.set(0, 350, 0);


		this.joystick = new JoyStick({
			onMove: this.playerControl,
			game: this
		});

		//controls = new OrbitControls( camera, renderer.domElement );
		

		


		// ground
		const tLoader = new THREE.TextureLoader();
		const groundTexture = tLoader.load(`${this.assetsPath}images/KakaoTalk_20210916_161315797.jpg`);
		groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
		groundTexture.repeat.set(8, 8);
		groundTexture.encoding = THREE.sRGBEncoding;

		const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

		var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(10000, 10000), groundMaterial);
		mesh.rotation.x = - Math.PI / 2;
		mesh.receiveShadow = true;
		this.scene.add(mesh);

		//이름표
		// this.makePerson(32, 'Purple People Eater');
		// this.makePerson(32, 'Green Machine');
		// this.makePerson(32, 'Red Menace');

		// 그리드
		// const mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 10000, 10000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
		// mesh.rotation.x = - Math.PI / 2;
		// //mesh.position.y = -100;
		// mesh.receiveShadow = true;
		// this.scene.add( mesh );

		const grid = new THREE.GridHelper(5000, 40, 0x000000, 0x000000);
		//grid.position.y = -100;
		grid.material.opacity = 0.2;
		grid.material.transparent = true;
		this.scene.add(grid);

		//table1
		
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table1) {
			table1.position.set(4000, 0, -1100);
			table1.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table1.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table1);
		});
		
		//컴퓨터
		loader.load(`${this.assetsPath}fbx/SM_Prop_Computer_Setup_01.fbx`, function (Computer) {
			Computer.position.set(4300, 150, -1000);
			Computer.scale.set(2, 2, 2);
			Computer.rotation.y = Math.PI / 1;
			tLoader.load(`${game.assetsPath}images/PolygonOffice_Texture_01_A.png`, function (Computertext) {
				Computer.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Computertext;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Computer);
		});

		//table2
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table2) {
			table2.position.set(3500, 0, 1000);
			table2.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table2.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table2);
		});

		//table3
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table3) {
			table3.position.set(3500, 0, -3500);
			table3.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table3.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table3);
		});

		//table4
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table4) {
			table4.position.set(-4500, 0, -1100);
			table4.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table4.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table4);
		});

		//table5
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table5) {
			table5.position.set(-3500, 0, 1000);
			table5.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table5.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table5);
		});

		//table6
		loader.load(`${this.assetsPath}fbx/Table.fbx`, function (table6) {
			table6.position.set(-3800, 0, -3500);
			table6.scale.set(2, 2, 2);
			// wall.rotation.y = Math.PI / 1;
			table6.traverse(function (child) {
				if (child.isMesh) {
					game.colliders.push(child);
				}
			});
			game.scene.add(table6);
		});

		//stage
		const geometry = new THREE.BoxGeometry(5000, 100, 2000);
		const material = new THREE.MeshBasicMaterial({ color: 'black', wireframe: false });
		const stage = new THREE.Mesh(geometry, material); 																//시작할때 서있는 스테이지박스
		stage.position.set(0, 100, 3000);
		this.colliders.push(stage);
		this.scene.add(stage);



		//스크린 바깥
		const geomscreenout = new THREE.BoxGeometry(5000, 3000, 80);
		const materscreenout = new THREE.MeshBasicMaterial({ color: 'gray', wireframe: false });
		const screenout = new THREE.Mesh(geomscreenout, materscreenout);
		screenout.position.set(0, 500, 4000);
		this.colliders.push(screenout);
		this.scene.add(screenout);

		//스크린 안
		const geomscreenin = new THREE.BoxGeometry(4500, 2500, 100);
		const materscreenin = new THREE.MeshBasicMaterial({ color: 'black', wireframe: false });
		const screenin = new THREE.Mesh(geomscreenin, materscreenin);
		screenin.position.set(0, 600, 4000);
		this.colliders.push(screenin);
		this.scene.add(screenin);

		// 계단
		//const loader = new THREE.FBXLoader();
		loader.load(`${this.assetsPath}fbx/SM_Buildings_Stairs_1x2_01P.fbx`, function (Stair) {
			Stair.position.set(-300, 0, 2000);
			Stair.scale.set(3, 3, 3);
			Stair.rotation.y = Math.PI / 1;

			tLoader.load(`${game.assetsPath}images/PolygonPrototype_Texture_04.png`, function (Stairtext) {
				Stair.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Stairtext;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Stair);
		});

		//차
		loader.load(`${this.assetsPath}fbx/SM_Veh_Car_Sports_01.fbx`, function (Car) {
			Car.position.set(-1700, 150, 3000);
			Car.scale.set(3, 3, 3);
			Car.rotation.y = Math.PI / 1.4;

			tLoader.load(`${game.assetsPath}images/PolygonPrototype_Texture_04.png`, function (Cartext) {
				Car.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Cartext;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Car);
		});

		//풍선
		loader.load(`${this.assetsPath}fbx/CB_Discobolus_LOD0.fbx`, function (balloons) {
			balloons.position.set(3500, 0, 2700);
			balloons.scale.set(4, 4, 4);
			balloons.rotation.y = Math.PI / 1.5;

			tLoader.load(`${game.assetsPath}images/Road_divider.png`, function (balloonstext) {
				balloons.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = balloonstext;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(balloons);
		});

		//트로피1 금

		loader.load(`${this.assetsPath}fbx/SM_Icon_Cup_01.fbx`, function (Cup1) {
			Cup1.position.set(-1700, 150, 2100);
			Cup1.scale.set(3, 3, 3);
			Cup1.rotation.y = Math.PI / 1.4;

			tLoader.load(`${game.assetsPath}images/PolygonPrototype_Texture_01.png`, function (Cup1text) {
				Cup1.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Cup1text;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Cup1);
		});

		//트로피2 은
		loader.load(`${this.assetsPath}fbx/SM_Icon_Cup_02.fbx`, function (Cup2) {
			Cup2.position.set(-1800, 150, 2100);
			Cup2.scale.set(1.7, 1.7, 1.7);
			Cup2.rotation.y = Math.PI / 1.4;

			tLoader.load(`${game.assetsPath}images/PolygonPrototype_Texture_01.png`, function (Cup2text) {
				Cup2.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Cup2text;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Cup2);

		});

		//트로피3 동
		loader.load(`${this.assetsPath}fbx/SM_Icon_Cup_03.fbx`, function (Cup3) {
			Cup3.position.set(-1600, 150, 2100);
			Cup3.scale.set(1.7, 1.7, 1.7);
			Cup3.rotation.y = Math.PI / 1.4;

			tLoader.load(`${game.assetsPath}images/PolygonPrototype_Texture_01.png`, function (Cup3text) {
				Cup3.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = Cup3text;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(Cup3);

		});

		//부스 왼쪽 - 가운데
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_leftmid) {
			booth_leftmid.position.set(4000, 0, -1100);
			booth_leftmid.scale.set(2, 2, 2);
			booth_leftmid.rotation.y = Math.PI / 1.3;

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 182013.png`, function (booth_leftmid_tx) {
				booth_leftmid.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_leftmid_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_leftmid);

		});

		//부스 왼쪽 - 왼쪽
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_leftleft) {
			booth_leftleft.position.set(3500, 0, 1000);
			booth_leftleft.scale.set(2, 2, 2);
			booth_leftleft.rotation.y = Math.PI / 2;

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 181738.png`, function (booth_leftleft_tx) {
				booth_leftleft.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_leftleft_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_leftleft);

		});

		//부스 왼쪽 - 오른쪽
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_leftright) {
			booth_leftright.position.set(3500, 0, -3500);
			booth_leftright.scale.set(2, 2, 2);
			booth_leftright.rotation.y = Math.PI / 1;

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 181456.png`, function (booth_leftright_tx) {
				booth_leftright.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_leftright_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_leftright);

		});

		//부스 오른쪽 - 가운데
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_rightmid) {
			booth_rightmid.position.set(-4000, 0, -1100);
			booth_rightmid.scale.set(2, 2, 2);
			booth_rightmid.rotation.set(0, -0.75, 0)

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 181605.png`, function (booth_rightmid_tx) {
				booth_rightmid.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_rightmid_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_rightmid);

		});

		//부스 오른쪽 - 왼쪽
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_rightmid) {
			booth_rightmid.position.set(-3500, 0, 1000);
			booth_rightmid.scale.set(2, 2, 2);
			booth_rightmid.rotation.y = Math.PI / 14;

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 181647.png`, function (booth_rightmid_tx) {
				booth_rightmid.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_rightmid_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_rightmid);

		});

		//부스 오른쪽 - 오른쪽
		loader.load(`${this.assetsPath}fbx/SM_Buildings_WallCurved_5x5_01.fbx`, function (booth_leftmid) {
			booth_leftmid.position.set(-3500, 0, -3500);
			booth_leftmid.scale.set(2, 2, 2);
			booth_leftmid.rotation.y = Math.PI / -2;

			tLoader.load(`${game.assetsPath}images/화면 캡처 2021-09-16 181834.png`, function (booth_leftmid_tx) {
				booth_leftmid.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = booth_leftmid_tx;
						game.colliders.push(child);
					}
				});
			});
			game.scene.add(booth_leftmid);

		});

		// const chat = document.getElementById('chat');
		// chat.style.bottom = '0px';
		
		
		// $('#msg-form [name="send"]').click( () =>{
		// 	const chatchat = document.getElementById('msg-form').value;
		// 	console.log(chatchat)
		// 	this.speechBubble.update(chatchat);
		// 	this.scene.add(this.speechBubble.mesh);
		// })



		if ('ontouchstart' in window) {
			window.addEventListener('touchdown', (event) => game.onMouseDown(event), false);
		} else {
			window.addEventListener('mousedown', (event) => game.onMouseDown(event), false);
		}

		window.addEventListener('resize', () => game.onWindowResize(), false);
	}

	loadEnvironment(loader) {
		const game = this;
		// loader.load(`${this.assetsPath}fbx/town.fbx`, function(object){
		// 	game.environment = object;
		// 	game.colliders = [];
		// 	game.scene.add(object);
		// 	object.traverse( function ( child ) {
		// 		if ( child.isMesh ) {
		// 			if (child.name.startsWith("proxy")){
		// 				game.colliders.push(child);
		// 				child.material.visible = false;
		// 			}else{
		// 				child.castShadow = true;
		// 				child.receiveShadow = true;
		// 			}
		// 		}
		// 	} );

		// const tLoader = new THREE.TextureLoader();
		// const backgroundtexture =tLoader.load( `${game.assetsPath}/images/pngegg.png` );
		// backgroundtexture.repeat.set(35,35);
		// game.scene.background = backgroundtexture;

		// game.loadNextAnim(loader);

		const tloader = new THREE.CubeTextureLoader();
		tloader.setPath(`${game.assetsPath}/images/`);

		var textureCube = tloader.load([
			'KakaoTalk_20210916_195442737.png', 'KakaoTalk_20210916_195442737.png',
			'KakaoTalk_20210916_195442737.png', 'KakaoTalk_20210916_195442737.png',
			'KakaoTalk_20210916_195442737.png', 'KakaoTalk_20210916_195442737.png'
		]);

		game.scene.background = textureCube;

		game.loadNextAnim(loader);


	}

	loadNextAnim(loader) {
		let anim = this.anims.pop();
		const game = this;
		loader.load(`${this.assetsPath}fbx/anims/${anim}.fbx`, function (object) {
			game.player.animations[anim] = object.animations[0];
			if (game.anims.length > 0) {
				game.loadNextAnim(loader);
			} else {
				delete game.anims;
				game.action = "Idle";
				game.mode = game.modes.ACTIVE;
				game.animate();
			}
		});
	}

	playerControl(forward, turn) {
		turn = -turn;

		if (forward > 0.3) {
			if (this.player.action != 'Walking' && this.player.action != 'Running') this.player.action = 'Walking';
		} else if (forward < -0.3) {
			if (this.player.action != 'Walking Backwards') this.player.action = 'Walking Backwards';
		} else {
			forward = 0;
			if (Math.abs(turn) > 0.1) {
				if (this.player.action != 'Turn') this.player.action = 'Turn';
			} else if (this.player.action != "Idle") {
				this.player.action = 'Idle';
			}
		}

		if (forward == 0 && turn == 0) {
			delete this.player.motion;
		} else {
			this.player.motion = { forward, turn };
		}

		this.player.updateSocket();
	}

	

	createCameras() {
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -500);
		back.parent = this.player.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.player.object;
		this.cameras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.cameras.back;
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight);

	}

	updateRemotePlayers(dt) {
		if (this.remoteData === undefined || this.remoteData.length == 0 || this.player === undefined || this.player.id === undefined) return;

		const newPlayers = [];
		const game = this;
		//Get all remotePlayers from remoteData array
		const remotePlayers = [];
		const remoteColliders = [];

		this.remoteData.forEach(function (data) {//원격데이터배열 foreach문 돌린다 // 배열의 각요소는 function(data) <- data가 된다
			if (game.player.id != data.id) {
				//이 플레이어가 초기화되고 있습니까?
				let iplayer;
				game.initialisingPlayers.forEach(function (player) {
					if (player.id == data.id) iplayer = player;
				});
				//초기화되지 않은 경우 remotePlayers 어레이 확인
				if (iplayer === undefined) {
					let rplayer;
					game.remotePlayers.forEach(function (player) {
						if (player.id == data.id) rplayer = player;
					});
					if (rplayer === undefined) {
						//Initialise player
						game.initialisingPlayers.push(new Player(game, data));//새로운 초기화가 필요하지 않음 그래서 데이터 패킷에 플레이어패턴의 새로운 인스턴스 생성
					} else {
						//Player exists
						remotePlayers.push(rplayer);//새원격플레이어배열에 푸시
						remoteColliders.push(rplayer.collider);
					}
				}
			}
		});

		this.scene.children.forEach(function (object) {
			if (object.userData.remotePlayer && game.getRemotePlayerById(object.userData.id) == undefined) {//원격플레이어가 존재하지 않을경우
				game.scene.remove(object);//장면에서 제거
			}
		});

		this.remotePlayers = remotePlayers;//원격플레이어 속성을 새로 할당
		this.remoteColliders = remoteColliders;
		this.remotePlayers.forEach(function (player) { player.update(dt); });
	}

	onMouseDown(event) {
		//if (this.remoteColliders === undefined || this.remoteColliders.length == 0 || this.speechBubble === undefined || this.speechBubble.mesh === undefined) return;

		// calculate mouse position in normalized device coordinates
		// (-1 to +1) for both components
		//const mouse = new THREE.Vector2();
		//mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
		//mouse.y = - (event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

		//const raycaster = new THREE.Raycaster();
		//raycaster.setFromCamera(mouse, this.camera);//방금 계산한 마우스갖ㅅ을 카메라에 전달

		//const intersects = raycaster.intersectObjects(this.remoteColliders);// 콜라이더 배열에 있는 교차되는 객체 모두 확인
		const m = document.getElementById('m');
		if (m.value != "")
		{
			const chat = document.getElementById('chat');
			//const players = this.remotePlayers;
			//console.log(this.remotePlayers)
			// for(i=0; i<=players.length; i++){
			// 	this.speechBubble.player =  players[i];
			// }
			this.nickname.player = this.player;
			//this.chatSocketId = this.player.id;
			this.nickname.update(m.value);
			this.scene.add(this.nickname.mesh);//말풍성메쉬 추가
			//chat.style.bottom = '0px';

			
		}


		// if (intersects.length > 0) {
		// 	const object = intersects[0].object;
		// 	const players = this.remotePlayers.filter(function (player) {//filter사용하여 방금 교차한 객체의 위치를 찾는다
		// 		if (player.collider !== undefined && player.collider == object) {
		// 			return true;
		// 		}
		// 	});


			// if (players.length > 0) {//플레이어 선택시 나타나는 효과 코드
			// 	const player = players[0];//실제 플레이어가 배열의 첫번째요소
			// 	console.log(`onMouseDown: player ${player.id}`);
			// 	this.speechBubble.player = player;
			// 	this.speechBubble.update('');
			// 	this.scene.add(this.speechBubble.mesh);//말풍성메쉬 추가
			// 	this.chatSocketId = player.id;
			// 	chat.style.bottom = '0px';
			// 	this.activeCamera = this.cameras.chat;
			// }
		// } else {
		// 	//Is the chat panel visible?
		// 	if (chat.style.bottom == '0px' && (window.innerHeight - event.clientY) > 40) {
		// 		console.log("onMouseDown: No player found");
		// 		if (this.speechBubble.mesh.parent !== null) this.speechBubble.mesh.parent.remove(this.speechBubble.mesh);
		// 		delete this.speechBubble.player;
		// 		delete this.chatSocketId;
		// 		chat.style.bottom = '-50px';//화면의 아래쪽으로 보냄
		// 		this.activeCamera = this.cameras.back;//활성카메라를 기본값으로 돌림
		// 	} else {
		// 		console.log("onMouseDown: typing");
		// 	}
		// }
	}

	getRemotePlayerById(id) {
		if (this.remotePlayers === undefined || this.remotePlayers.length == 0) return;

		const players = this.remotePlayers.filter(function (player) {
			if (player.id == id) return true;
		});

		if (players.length == 0) return;

		return players[0];
	}

	

	// addLabel( name, pos ) {

	// 	// if(this.textMesh !== undefined && this.player !== undefined){
	// 	//    this.textMesh.position.set(this.player.object.position.x, this.player.object.position.y + 300, this.player.object.position.z);
	// 	//    this.textMesh.lookAt(pos)
	// 	// }
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

	// 	const textMaterial = new THREE.MeshBasicMaterial( { color: 0xFF00FF } );
	// 	this.textMesh = new THREE.Mesh( textGeo, textMaterial );
	// 	this.textMesh.position.copy(pos);
	// 	this.textMesh.rotation.y = Math.PI / 1;
	// 	this.scene.add( this.textMesh );
	// 	})
	// }

	animate() {
		const game = this;
		const dt = this.clock.getDelta();

		requestAnimationFrame(function () { game.animate(); });

		this.updateRemotePlayers(dt);//화면 새로 고침에서 길을 잃은 후 경과된 델타 시간 내에 플레이어 초기화와 플레이어 이동을 처리해야 합니다.

		if (this.player.mixer != undefined && this.mode == this.modes.ACTIVE) {
			this.player.mixer.update(dt);
			//this.textMesh.mixer.update(dt);
		}

		if (this.player.action == 'Walking') {
			const elapsedTime = Date.now() - this.player.actionTime;
			if (elapsedTime > 1000 && this.player.motion.forward > 0) {
				this.player.action = 'Running';
			}
		}

		if (this.player.motion !== undefined) {
			this.player.move(dt);
		}

		if (this.cameras != undefined && this.cameras.active != undefined && this.player !== undefined && this.player.object !== undefined) {
			this.camera.position.lerp(this.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			const pos = this.player.object.position.clone();
			if (this.cameras.active == this.cameras.chat) {
				pos.y += 200;
			} else {
				pos.y += 300;
			}
			this.camera.lookAt(pos);
		}

		if (this.sun !== undefined) {
			this.sun.position.copy(this.camera.position);
			this.sun.position.y += 10;
		}

		// const onOK = null;
		// var name = '';
		
		// const btn = document.getElementById('nick-button');
		// const panel = document.getElementById('nickname');
		// if (onOK != null) {
		// 	btn.onclick = function () {
		// 		panel.style.display = 'block';
		// 	}
		// } else {
		// 	btn.onclick = function () {
		// 		panel.style.display = 'none'; //안보이게됨
		// 		name = document.getElementById('nick-m').value;
		// 		game.addLabel(name, new THREE.Vector3(game.camera.position.x, game.camera.position.y, game.camera.position.z+200));
		// 	}
		// }
		
		
		if (this.nickname !== undefined) this.nickname.show(this.camera.position);
		this.renderer.render(this.scene, this.camera);
	}

	



}




