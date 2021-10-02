class Nickname{
    constructor(game, msg){
        this.config = { font: "Calibri", size: 50, padding: 10, colour: '#f5f5dc', width: 256, height: 256 }

        this.assetsPath = 'assets/';

        const planeGeometry = new THREE.PlaneGeometry(100, 100);
		const planeMaterial = new THREE.MeshBasicMaterial()
		this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);

        const Tloader = new THREE.TextureLoader();
        Tloader.load(`${game.assetsPath}images/400X200+png파일.png`,(texture) => {
            this.img = texture.image;
            this.mesh.material.map = texture;
            this.mesh.material.transparent = true; //투명
            this.mesh.material.needsUpdate = true; //재료를 다시 컴파일해야 함을 지정
            if (msg !== undefined)
                this.update(msg); //양쪽 비교값의 타입이 다른 경우 타입 변환하지 않음
        });
    } // 생성자 끝

    // 다른 thread에서 캔버스 렌더링
    // main thread와 별개로 Worker thread에서 수행
    createOffscreenCanvas(w, h) {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}

    update(msg) {
        if (this.mesh === undefined) return; // mesh에 아무것도 없으면 return

        let context = this.context;

        // userdata.context에 아무것도 없을때
        if (this.mesh.userData.context === undefined) {
            const canvas = this.createOffscreenCanvas(this.config.width, this.config.height);
            this.context = canvas.getContext('2d'); // getContext는 상자, 원, 텍스트, 이미지 등을 그려줌
            context = this.context; // 글자 그자체
            context.font = `${this.config.size}pt ${this.config.font}`;
            context.fillStyle = this.config.colour;
            context.textAlign = 'center'
            this.mesh.material.map = new THREE.CanvasTexture(canvas); //캔버스를 텍스처로 활용
        }

        const img = this.img;
        context.drawImage(img, 0, 0, this.config.width, this.config.height); //캔버스에 이미지 그려줌
        this.wrapText(msg, context);
        this.mesh.material.map.needsUpdate = true; //재료를 다시 컴파일해야 함을 지정
    }

    wrapText(text, context) {
		const words = text.split(' ');
		let line = '';
		const lines = [];
		const maxWidth = this.config.width - 2 * this.config.padding;
		const lineHeight = this.config.size + 8;

		words.forEach(function (word) {
			const testLine = `${line}${word} `;
			const metrics = context.measureText(testLine);
			const testWidth = metrics.width;
			if (testWidth > maxWidth) {
				lines.push(line);
				line = `${word} `;
			} else {
				line = testLine;
			}
		});

		if (line != '') lines.push(line);

		let y = (this.config.height - lines.length * lineHeight) / 2;

		lines.forEach(function (line) {
			context.fillText(line, 128, y);
			y += lineHeight;
		});
	}

    show(pos) {
        if (this.mesh !== undefined && this.player !== undefined) {
            this.mesh.position.set(this.player.object.position.x,
                                   this.player.object.position.y + 300,
                                   this.player.object.position.z);
            this.mesh.lookAt(pos); // mesh를 중심으로 pos만큼 돌아간다??
        }
    }


}