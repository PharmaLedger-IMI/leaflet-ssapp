import Scanner from "../../lib/zxing-wrapper/scanner.js";

function createOverlay([x, y, w, h], canvasDimensions) {
	const canvas = document.createElement("canvas");
	canvas.id = "overlay";
	canvas.width = canvasDimensions.width;
	canvas.height = canvasDimensions.height;
	canvas.style.position = "absolute";
	canvas.style.top = "50%";
	canvas.style.left = "50%";
	canvas.style.transform = "translate(-50%, -50%)";

	const context = canvas.getContext("2d");
	context.lineWidth = 6;
	context.strokeStyle = "rgb(255, 255, 255)";
	context.fillStyle = "rgba(0, 0, 0, 0.5)";

	const r = 20;

	const clearBackdrop = (x, y, w, h, r) => {
		context.save();
		context.beginPath();

		context.moveTo(x + r, y);
		context.lineTo(x + w - r, y);
		context.quadraticCurveTo(x + w, y, x + w, y + r);
		context.lineTo(x + w, y + h - r);
		context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		context.lineTo(x + r, y + h);
		context.quadraticCurveTo(x, y + h, x, y + h - r);
		context.lineTo(x, y + r);
		context.quadraticCurveTo(x, y, x + r, y);

		context.clip();
		context.clearRect(x, y, w, h);
		context.restore();
	};

	const drawBackdrop = (x, y, w, h) => {
		context.fillRect(x, y, w, h);
	};

	const drawCorners = (x, y, w, h) => {
		const p = [
			new Path2D("M53 3H19C10.1634 3 3 8.84767 3 16.0612V43"),
			new Path2D("M53 43L53 15.8C53 8.73072 45.6904 3 36.6735 3L3 3"),
			new Path2D("M3 43L37 43C45.8366 43 53 37.1523 53 29.9388L53 3"),
			new Path2D("M3 3L3 30.2C3 37.2693 10.3096 43 19.3265 43L53 43"),
		];

		// dimensions of Path2D
		const d = {
			l: context.lineWidth,
			w: 50,
			h: 40,
		};

		context.translate(x, y);
		context.stroke(p[0]);

		context.translate(w - d.w - d.l, 0);
		context.stroke(p[1]);

		context.translate(0, h - d.h - d.l);
		context.stroke(p[2]);

		context.translate(d.w + d.l - w, 0);
		context.stroke(p[3]);

		context.resetTransform();
	};

	drawBackdrop(0, 0, canvasDimensions.width, canvasDimensions.height);

	clearBackdrop(x, y, w, h, r);

	drawCorners(x, y, w, h);

	return canvas;
}

function nativeLayerAvailable() {
	let result = false;
	try {
		result = window.opendsu_native_apis && typeof window.opendsu_native_apis === "object" && typeof window.opendsu_native_apis.createNativeBridge === "function";
	} catch (err) {
		//we ignore any errors...
	}
	return result;
}

export default class ScanService {
	constructor(domElement) {
		this.scanner = new Scanner(domElement);

		//todo: remove this changeWorker call when possible
		this.scanner.changeWorker("lib/zxing-wrapper/worker/zxing-0.18.6-worker.js");

		this.scanner.drawOverlay = (centralPoints, canvasDimensions) => {
			const overlay = createOverlay(centralPoints, canvasDimensions);
			domElement.append(overlay)
		}

		this.usingNativeLayer = nativeLayerAvailable();
	}

	setup() {
		if (!this.usingNativeLayer) {
			//running browser only apis...
			this.scanner.setup();
		} else {
			this.scanner.setup(true);
			//console.log("!!! Native Layer not implemented yet !!!");
		}
	}

	async scan() {
		if (!this.usingNativeLayer) {
			return await this.scanner.scan();
		} else {
			return new Promise((resolve, reject) => {
				function scanOneFrame() {
					return new Promise((resolve, reject) => {
						this.photoStream.retrieveNextValue().then(async (resultArray) => {
							try {
								const frameBlob = resultArray[0];
								const width = resultArray[1];
								const height = resultArray[2];

								const arrayBuffer = await frameBlob.arrayBuffer();
								const imageBuffer = new Uint8ClampedArray(arrayBuffer);
								let imageData = new ImageData(imageBuffer, width, height);

								let scanResult = await this.scanner.scanImageData(imageData);
								resolve(scanResult);
							} catch (err) {
								reject(err);
							}
						}, (error) => {
							reject(error);
						});
					});
				}

				if (!this.photoStream) {
					opendsu_native_apis.createNativeBridge(async (err, handler) => {
						if (err) {
							reject(err);
						}
						let result;
						try {
							this.photoStream = handler.importNativeStreamAPI("photoCaptureStream");
							const settings = JSON.stringify({"captureType": "rgba"});
							await this.photoStream.openStream([settings]);
							result = await scanOneFrame();
						} catch (err) {
							reject(err)
						}
						resolve(result);
					});
				}
			});
		}
	}

	stop() {
		if (!this.usingNativeLayer) {
			this.scanner.shutDown();
		} else {
			console.log("!!! Native Layer not implemented yet !!!");
		}
	}
}