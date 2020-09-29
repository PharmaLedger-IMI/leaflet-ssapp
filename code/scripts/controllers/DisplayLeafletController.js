import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class DisplayLeafletController extends ContainerController {
	constructor(element, history) {
		super(element);

		if (typeof history.location.state !== "undefined") {
			this.SGTIN = history.location.state.SGTIN;
		}

		const identity = "demo/agent/007";
		//if (typeof $$.interactions === "undefined") {
			//require('callflow').initialise();
			$$.swarmEngine = undefined;
			$$.swarms = undefined;
			$$.swarm = undefined;
			const se = require("swarm-engine");
			se.initialise(identity);
			const SRPC = se.SmartRemoteChannelPowerCord;
			let swUrl = window.location.origin;
			if(!swUrl.endsWith("/")){
				swUrl += "/";
			}
			const powerCord = new SRPC([swUrl]);
			$$.swarmEngine.plug(identity, powerCord);
		//}

		let hash = "leaflet";
		let productDSU = this.SGTIN;
		$$.interactions.startSwarmAs(identity, "leafletLoader", "mountProductDSU", "/apps/"+hash, productDSU).onReturn((err, result)=>{
			if(err){
				console.log(err);
				return;
			}

			this.setModel({
				appName:hash,
				landingPath:"/view-leaflet"
			});

			//this.setModel({leaflet_src:leafletPath+"/attachment.png"});

			this.DSUStorage.getItem('/data/drugsHistory.json', 'json', (err, drugsHistory) => {
				if (err) {
					drugsHistory = [];
				}

				let scanDate = new Date();
				scanDate = `scanned at ${scanDate.getDay()}/${scanDate.getMonth()}/${scanDate.getFullYear()} ${scanDate.getHours()}:${scanDate.getMinutes()	}`

				drugsHistory.push({sgtin: history.location.state.SGTIN, scanDate});

				this.DSUStorage.setItem('/data/drugsHistory.json', JSON.stringify(drugsHistory), err => {
					if (err) {
						throw err;
					}
				});
			});
		});
	}
}