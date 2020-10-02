import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import utils from "../../utils.js";

const gtinResolver = require("gtin-resolver");
export default class ScanController extends ContainerController {
	constructor(element, history) {
		super(element);
		this.setModel({data: '', hasCode: false});

		this.model.onChange("data", () => {
			this.model.hasCode = true;
		});
		this.on("displayLeaflet", (event)=>{
			const gtinComponents = utils.parse(this.model.data);
			const gtinSSI = gtinResolver.createGTIN_SSI("default", gtinComponents.gtin, gtinComponents.batchNumber, gtinComponents.expirationDate);
			if (typeof $$.interactions === "undefined") {
				require('callflow').initialise();
				const se = require("swarm-engine");
				const identity = "test/agent/007";
				se.initialise(identity);
				const SRPC = se.SmartRemoteChannelPowerCord;
				let swUrl = "http://localhost:8080/";
				const powerCord = new SRPC([swUrl]);
				$$.swarmEngine.plug(identity, powerCord);
			}

			$$.interactions
				.startSwarmAs("test/agent/007", "leafletLoader", "mountDSU", `/tmp`, gtinSSI.getIdentifier())
				.onReturn((err, res) => {
					history.push("/drug-details");
				});
		});
	}
}