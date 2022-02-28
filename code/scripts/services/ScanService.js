/*
* const photoStream = nativeHandler.importNativeStreamAPI("photoCaptureStream");
      const settings = JSON.stringify({"captureType": "rgba"});
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');

      photoStream.openStream([settings]).then(() => {
        const interval = setInterval(async () => {
          photoStream.retrieveNextValue().then( async (resultArray) => {
            const frameBlob = resultArray[0];
            const width = resultArray[1];
            const height = resultArray[2];

            const arrayBuffer = await frameBlob.arrayBuffer();
            const imageBuffer = new Uint8ClampedArray(arrayBuffer);
            let imageData = new ImageData(imageBuffer, width, height);
            canvas.width = height;
            canvas.height = width;
            ctx.putImageData(imageData, 0, 0);
            console.log(frameBlob, width, height);
          }, (error) => {
            console.log("next value error: " + error);
          });
        }, 100);
* */


import Scanner from "../../lib/zxing-wrapper/scanner.js";

function nativeLayerAvailable(){
	let result = false;
	try{
		result = window.opendsu_native_apis && typeof window.opendsu_native_apis === "object" && typeof window.opendsu_native_apis.createNativeBridge === "function";
	}catch(err){
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
		if(!this.usingNativeLayer){
			//running browser only apis...
			this.scanner.setup();
		}else{
			console.log("!!! Native Layer not implemented yet !!!");
		}
	}

	async scan() {
		if(!this.usingNativeLayer){
			return await this.scanner.scan();
		}else{
			console.log("!!! Native Layer not implemented yet !!!");
		}
	}

	stop() {
		if(!this.usingNativeLayer){
			this.scanner.shutDown();
		}else{
			console.log("!!! Native Layer not implemented yet !!!");
		}
	}
}