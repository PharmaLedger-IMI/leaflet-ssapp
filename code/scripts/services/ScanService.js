import Scanner from "../../lib/zxing-wrapper/scanner.js";

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